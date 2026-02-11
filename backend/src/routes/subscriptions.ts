import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

// BigInt serialization fix for Prisma + JSON
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

const router = Router();
const prisma = new PrismaClient();

const ADMIN_TG_ID = '7179785109';
const BOT_TOKEN = process.env.BOT_TOKEN;

// Multer Setup for Receipts
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/receipts';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper to notify admin
async function notifyAdmin(user: any, requestId: string, receiptPath: string) {
    if (!BOT_TOKEN) return console.error('❌ BOT_TOKEN missing in .env');
    const ADMIN_TG_ID = "7179785109"; // Hardcoded for single admin

    const userLine = user.username ? `@${user.username}` : user.firstName || 'User';
    const phoneLine = user.phoneNumber ? `📱 Phone: \`${user.phoneNumber}\`\n` : '';

    const caption = `💰 *Новый запрос на Premium!*\n\n` +
        `👤 Клиент: *${userLine}*\n` +
        `${phoneLine}` +
        `🆔 TG ID: \`${user.telegramId}\`\n` +
        `📝 Request ID: \`${requestId}\`\n\n` +
        `Проверьте оплату и выберите действие:`;

    try {
        const form = new FormData();
        form.append('chat_id', ADMIN_TG_ID);
        form.append('photo', fs.createReadStream(receiptPath));
        form.append('caption', caption);
        form.append('parse_mode', 'Markdown');
        form.append('reply_markup', JSON.stringify({
            inline_keyboard: [
                [{ text: '✅ Подключить премиум', callback_data: `approve:${requestId}` }],
                [{ text: '❌ Отказать (не вижу скрин)', callback_data: `reject:no_image:${requestId}` }],
                [{ text: '❌ Отказать (нет денег)', callback_data: `reject:no_funds:${requestId}` }]
            ]
        }));

        const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, form, {
            headers: form.getHeaders(),
            timeout: 15000
        });

        console.log('✅ Telegram notification sent successfully to admin');

        // Delete receipt file after successful send
        fs.unlink(receiptPath, (err) => {
            if (err) {
                console.warn(`⚠️ Failed to delete receipt file ${receiptPath}: ${err.message}`);
            } else {
                console.log(`✅ Receipt file deleted: ${receiptPath}`);
            }
        });
    } catch (error: any) {
        console.error('❌ Failed to notify admin via Telegram:', error.response?.data || error.message);
        // Still try to delete file even if send failed
        fs.unlink(receiptPath, (err) => {
            if (err) {
                console.warn(`⚠️ Failed to delete receipt file ${receiptPath}: ${err.message}`);
            }
        });
    }
}

// 1. Request Payment (Manual P2P with Receipt Upload)
router.post('/request', upload.single('receipt'), async (req, res) => {
    try {
        const { userId, phoneNumber } = req.body;
        const receipt = req.file;

        if (!userId || !receipt) {
            return res.status(400).json({ error: 'User ID and Receipt Image required' });
        }

        let user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        // Update phone number if provided
        if (phoneNumber && phoneNumber !== user.phoneNumber) {
            user = await prisma.user.update({
                where: { id: userId },
                data: { phoneNumber }
            });
        }

        const request = await prisma.paymentRequest.create({
            data: {
                userId,
                receiptUrl: receipt.path,
                amount: 30,
                status: 'PENDING'
            }
        });

        console.log(`✅ Subscription request created: ${request.id} for user ${userId}`);

        // Async notify admin (fire and forget)
        notifyAdmin(user, request.id, receipt.path).catch(e => {
            console.error('Fire-and-forget notifyAdmin failed:', e);
        });

        res.json({ success: true, request });
    } catch (error: any) {
        console.error('❌ Payment request route failed:', error);
        res.status(500).json({ error: 'Internal server error during request' });
    }
});

// 2. Check Subscription Status (For Frontend Mini App Display)
router.get('/status/:userId', async (req, res) => {
    try {
        const userId = req.params.userId?.trim();

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.json({ isPremium: false, lastRequestStatus: 'NONE' });

        const request = await prisma.paymentRequest.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            isPremium: user.isPremium,
            lastRequestStatus: request?.status || 'NONE',
            lastRequestDate: request?.createdAt || null
        });
    } catch (error: any) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Internal error' });
    }
});

// 3. List Pending Requests (For Admin Dashboard fallback)
router.get('/pending', async (req, res) => {
    try {
        const requests = await prisma.paymentRequest.findMany({
            where: { status: 'PENDING' },
            include: { user: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: 'Internal error' });
    }
});

// 4. Approve Payment (Internal/Admin fallback)
router.post('/approve', async (req, res) => {
    try {
        const { requestId } = req.body;
        if (!requestId) return res.status(400).json({ error: 'Request ID required' });

        const request = await prisma.paymentRequest.findUnique({
            where: { id: requestId }
        });

        if (!request) return res.status(404).json({ error: 'Request not found' });
        if (request.status !== 'PENDING') return res.status(400).json({ error: 'Request already processed' });

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90);

        await prisma.$transaction([
            prisma.paymentRequest.update({
                where: { id: requestId },
                data: { status: 'APPROVED' }
            }),
            prisma.user.update({
                where: { id: request.userId },
                data: { isPremium: true, subscriptionExpiresAt: expiresAt }
            })
        ]);

        res.json({ success: true, expiresAt });
    } catch (error) {
        res.status(500).json({ error: 'Internal error' });
    }
});

// 5. Reject Payment (Admin)
router.post('/reject', async (req, res) => {
    try {
        const { requestId, reason } = req.body;
        if (!requestId) return res.status(400).json({ error: 'Request ID required' });

        const request = await prisma.paymentRequest.update({
            where: { id: requestId },
            data: { status: 'REJECTED' }
        });

        // Notify User via Telegram (if linked)
        const user = await prisma.user.findUnique({ where: { id: request.userId } });
        if (user && user.telegramId && BOT_TOKEN) {
            const reasonText = reason === 'no_image' ? 'Нечеткий или отсутствующий скриншот' : 'Оплата не найдена';
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                chat_id: user.telegramId.toString(),
                text: `⚠️ *Оплата отклонена*\n\nПричина: ${reasonText}\n\nПожалуйста, отправьте корректный чек в меню Premium ещё раз.`,
                parse_mode: 'Markdown'
            }).catch(() => { });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Internal error' });
    }
});

// 6. Verify DC Merchant Payment
import { checkDCPayment } from '../services/dcMerchant';

router.post('/verify-dc', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'User ID required' });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Comment code expected: "#<TELEGRAM_ID>" or just "<TELEGRAM_ID>"
        // We will check for the telegram ID in the comment
        const commentCode = user.telegramId.toString();
        const amount = 30; // Hardcoded price for now

        console.log(`[Verify DC] Checking for user ${userId} with code ${commentCode}`);

        const verification = await checkDCPayment(commentCode, amount);

        if (verification.success && verification.transaction) {
            // Check if already processed (optional, but good practice to prevent double dipping if we stored transaction IDs)
            // For now, we trust the "last 7 days" and "isPremium" check.
            // But if user pays once, they could spam verify. 
            // Better: Store the transaction ID in PaymentRequest to ensure uniqueness.

            const existing = await prisma.paymentRequest.findFirst({
                where: { transactionId: verification.transaction.docnum } // Using docnum as unique ID
            });

            if (existing) {
                return res.json({ success: false, message: 'Этот платеж уже был использован.' });
            }

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 90);

            // Create approved payment record
            await prisma.paymentRequest.create({
                data: {
                    userId,
                    amount: 30,
                    status: 'APPROVED',
                    currency: 'TJS',
                    transactionId: verification.transaction.docnum,
                    receiptUrl: 'dc_merchant_auto', // No file
                }
            });

            // Activate Premium
            await prisma.user.update({
                where: { id: userId },
                data: { isPremium: true, subscriptionExpiresAt: expiresAt }
            });

            console.log(`[Verify DC] Success for user ${userId}`);

            // Notify Admin
            if (BOT_TOKEN) {
                const userLine = user.username ? `@${user.username}` : user.firstName || 'User';
                const phoneLine = user.phoneNumber ? `📱 Телефон: \`${user.phoneNumber}\`\n` : '';
                const profileLink = `tg://user?id=${user.telegramId}`;

                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    chat_id: ADMIN_TG_ID,
                    text: `✅ *Новая оплата через DC Wallet!*\n\n` +
                        `👤 Клиент: [${userLine}](${profileLink})\n` +
                        `${phoneLine}` +
                        `🆔 ID: \`${user.telegramId}\`\n` +
                        `💰 Сумма: *30 TJS*\n` +
                        `📄 Док: \`${verification.transaction.docnum}\`\n\n` +
                        `✨ Премиум активирован автоматически на 3 месяца.`,
                    parse_mode: 'Markdown'
                }).catch(() => { });
            }

            return res.json({ success: true, expiresAt });
        } else {
            return res.json({ success: false, message: 'Оплата не найдена. Проверьте комментарий или попробуйте позже.' });
        }

    } catch (error) {
        console.error('[Verify DC] Error:', error);
        res.status(500).json({ error: 'Internal error' });
    }
});

export default router;
