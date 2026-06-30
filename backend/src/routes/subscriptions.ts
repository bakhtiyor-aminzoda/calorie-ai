import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import crypto from 'crypto';

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

// 7. Initiate Alif Mobi payment request (sets status to PENDING)
function generateInvoiceId(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(100000 + Math.random() * 900000).toString();
    return timestamp + random;
}

router.post('/alif/initiate', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'User ID required' });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        let invoiceId = generateInvoiceId();
        // Ensure uniqueness
        let existing = await prisma.paymentRequest.findUnique({ where: { invoiceId } });
        while (existing) {
            invoiceId = generateInvoiceId();
            existing = await prisma.paymentRequest.findUnique({ where: { invoiceId } });
        }

        const request = await prisma.paymentRequest.create({
            data: {
                userId,
                invoiceId,
                amount: 30,
                status: 'PENDING',
                currency: 'TJS',
                receiptUrl: 'alif_mobi'
            }
        });

        console.log(`[Alif Initiate] Created PENDING payment request ${request.id} (invoice: ${invoiceId}) for user ${userId}`);
        res.json({ success: true, request, invoiceId });
    } catch (error: any) {
        console.error('[Alif Initiate] Error:', error);
        res.status(500).json({ error: 'Internal error' });
    }
});

// 8. Alif Bank Callback (handles check, pay, status)
router.post('/alif/callback', async (req, res) => {
    try {
        // Basic Auth Validation (support both standard "Basic <base64>" and Alif's direct "<base64>")
        let authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ code: 401, error: 'Unauthorized' });
        }
        
        if (authHeader.toLowerCase().startsWith('basic ')) {
            authHeader = authHeader.substring(6);
        }
        
        const credentials = Buffer.from(authHeader, 'base64').toString('utf8');
        const [login, password] = credentials.split(':');
        
        const alifLogin = process.env.ALIF_LOGIN || 'alif_user';
        const alifPassword = process.env.ALIF_PASSWORD || 'alif_pass';
        if (login !== alifLogin || password !== alifPassword) {
            return res.status(401).json({ code: 401, error: 'Unauthorized' });
        }

        // Parse from raw body to preserve BigInt precision in 'id' field
        const rawBody: string | undefined = (req as any).rawBody;
        const parsedBody: any = rawBody ? JSON.parse(rawBody, (_key, value) =>
            typeof value === 'number' && !Number.isSafeInteger(value) ? String(value) : value
        ) : req.body;
        const { action, id, account, amount } = parsedBody;
        console.log(`[Alif Callback] Received: action=${action}, id=${id}, account=${account}, amount=${amount}`);

        if (!action) {
            return res.status(400).json({ code: 400, message: 'Action missing' });
        }

        // Action: check
        if (action === 'check') {
            if (!account || id === undefined) {
                return res.json({ code: 400, id, message: 'Account or ID missing' });
            }

            const paymentRequest = await prisma.paymentRequest.findUnique({
                where: { invoiceId: account },
                include: { user: true }
            });

            if (!paymentRequest) {
                return res.json({ code: 404, id, message: 'Invoice not found' });
            }

            const user = paymentRequest.user;

            return res.json({
                code: 302,
                id,
                amount: "30.00",
                info_for_client: `Оплата Premium-доступа для ${user.username || user.firstName || 'пользователя'}`
            });
        }

        // Action: pay
        if (action === 'pay') {
            if (!account || id === undefined || amount === undefined) {
                return res.json({ code: 400, id, message: 'Missing parameters' });
            }

            const paymentRequest = await prisma.paymentRequest.findUnique({
                where: { invoiceId: account },
                include: { user: true }
            });

            if (!paymentRequest) {
                return res.json({ code: 404, id, message: 'Invoice not found' });
            }

            const user = paymentRequest.user;

            const payAmount = parseFloat(amount);
            if (isNaN(payAmount) || payAmount < 30) {
                return res.json({ code: 405, id, message: 'Amount out of range (minimum 30 TJS)' });
            }

            // Check duplicate transaction ID
            const existingRequest = await prisma.paymentRequest.findFirst({
                where: { transactionId: String(id) }
            });

            if (existingRequest) {
                let code = 200;
                if (existingRequest.status === 'REJECTED') code = 203;
                if (existingRequest.status === 'PENDING') code = 201;

                return res.json({
                    code,
                    id,
                    response_id: existingRequest.id
                });
            }

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 90);

            const updatedRequest = await prisma.paymentRequest.update({
                where: { id: paymentRequest.id },
                data: {
                    status: 'APPROVED',
                    transactionId: String(id),
                    amount: Math.round(payAmount)
                }
            });

            // Activate Premium
            await prisma.user.update({
                where: { id: user.id },
                data: { isPremium: true, subscriptionExpiresAt: expiresAt }
            });

            console.log(`[Alif Pay] Success: Activated Premium for user ${user.id} (TG: ${user.telegramId}), invoice ${account}, transaction ${id}`);

            // Notify User via Bot
            if (BOT_TOKEN) {
                const userLine = user.username ? `@${user.username}` : user.firstName || 'User';
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    chat_id: user.telegramId.toString(),
                    text: `🎉 *Поздравляем! Ваш Premium активирован!* 🎉\n\nВаша оплата через *Alif Mobi* на сумму *${payAmount} TJS* была успешно проведена.\n\nТеперь у вас есть безлимитный доступ ко всем функциям на 90 дней. Приятного аппетита! 🍏`,
                    parse_mode: 'Markdown'
                }).catch(err => console.error('[Alif Pay Notification] Failed to notify user:', err.message));
            }

            // Notify Admin via Bot
            if (BOT_TOKEN) {
                const ADMIN_TG_ID = "7179785109";
                const userLine = user.username ? `@${user.username}` : user.firstName || 'User';
                const phoneLine = user.phoneNumber ? `📱 Телефон: \`${user.phoneNumber}\`\n` : '';
                const profileLink = `tg://user?id=${user.telegramId}`;

                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    chat_id: ADMIN_TG_ID,
                    text: `✅ *Новая оплата через Alif Mobi!*\n\n` +
                        `👤 Клиент: [${userLine}](${profileLink})\n` +
                        `${phoneLine}` +
                        `🆔 TG ID: \`${user.telegramId}\`\n` +
                        `🧾 Счет: \`${account}\`\n` +
                        `💰 Сумма: *${payAmount} TJS*\n` +
                        `📄 Транзакция Alif: \`${id}\`\n\n` +
                        `✨ Премиум активирован автоматически на 3 месяца.`,
                    parse_mode: 'Markdown'
                }).catch(err => console.error('[Alif Pay Admin Notification] Failed to notify admin:', err.message));
            }

            return res.json({
                code: 200,
                id,
                response_id: updatedRequest.id
            });
        }

        // Action: status
        if (action === 'status') {
            if (id === undefined) {
                return res.json({ code: 400, id, message: 'ID missing' });
            }

            const request = await prisma.paymentRequest.findFirst({
                where: { transactionId: String(id) }
            });

            if (!request) {
                return res.json({ code: 104, id, message: 'Transaction not found' });
            }

            let code = 201;
            if (request.status === 'APPROVED') code = 200;
            if (request.status === 'REJECTED') code = 203;

            return res.json({
                code,
                id,
                response_id: request.id
            });
        }

        return res.json({ code: 400, id, message: 'Invalid action' });
    } catch (error: any) {
        console.error('[Alif Callback] Error:', error);
        res.json({ code: 500, message: 'Internal server error' });
    }
});

// Helper for Eskhata Bank Fast-Pay Hashing (HMAC SHA-256)
function generateEskhataHash(params: string[], hashKey: string): string {
    const paramsValues = params.join('');
    const hashString = `${paramsValues}.${hashKey}`;
    return crypto.createHash('sha256').update(hashString).digest('hex');
}

// 9. Initiate Eskhata Bank payment request
router.post('/eskhata/initiate', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'User ID required' });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Create PENDING request in database
        const request = await prisma.paymentRequest.create({
            data: {
                userId,
                amount: 30, // 30 TJS
                status: 'PENDING',
                currency: 'TJS',
                receiptUrl: 'eskhata'
            }
        });

        const invoiceId = request.id;
        const amountStr = "30.00"; // Always exactly two decimals
        const currencyStr = "972"; // TJS ISO 4217
        const posIdStr = String(process.env.ESKHATA_POS_ID || '0');
        const orderTypeIdStr = "2"; // Invoicing
        const hashKey = process.env.ESKHATA_HASH_KEY || 'test_hash_key';

        // Hashing string: invoiceId + amount + currency + posId + orderTypeId + "." + HashKey
        const hashValue = generateEskhataHash([invoiceId, amountStr, currencyStr, posIdStr, orderTypeIdStr], hashKey);

        const eskhataApiUrl = process.env.ESKHATA_API_URL || 'https://sandbox.eskhata.tj';
        const companyIdBase64 = Buffer.from(process.env.ESKHATA_COMPANY_ID || 'test_company').toString('base64');

        console.log(`[Eskhata Initiate] Calling Eskhata create API for request ${invoiceId}`);
        
        try {
            const response = await axios.post(`${eskhataApiUrl}/merchant/api/v1/orders/create`, {
                hash: hashValue,
                invoiceId,
                amount: 30.00,
                currency: currencyStr,
                posId: Number(posIdStr),
                orderTypeId: 2
            }, {
                headers: {
                    'X-CompanyId': companyIdBase64,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            const resData = response.data;
            if (resData && resData.status === true && resData.data) {
                const orderId = resData.data.orderId;
                const paymentUrl = resData.data.qr || resData.data.url; // Support both just in case

                // Update request with Eskhata orderId and payment link
                await prisma.paymentRequest.update({
                    where: { id: invoiceId },
                    data: {
                        transactionId: String(orderId),
                        receiptUrl: paymentUrl
                    }
                });

                console.log(`[Eskhata Initiate] Order created successfully: orderId=${orderId}, url=${paymentUrl}`);
                return res.json({ success: true, request, paymentUrl });
            } else {
                console.error(`[Eskhata Initiate] API Error:`, resData);
                // Reject payment request in DB
                await prisma.paymentRequest.update({
                    where: { id: invoiceId },
                    data: { status: 'REJECTED' }
                });
                return res.status(400).json({ error: resData?.message || 'Eskhata order creation failed' });
            }
        } catch (apiError: any) {
            console.error(`[Eskhata Initiate] API request failed:`, apiError.response?.data || apiError.message);
            // Reject payment request in DB
            await prisma.paymentRequest.update({
                where: { id: invoiceId },
                data: { status: 'REJECTED' }
            });
            return res.status(500).json({ error: 'Failed to communicate with Eskhata Bank' });
        }
    } catch (error: any) {
        console.error('[Eskhata Initiate] Unexpected Error:', error);
        res.status(500).json({ error: 'Internal error' });
    }
});

// 10. Eskhata Bank Callback (Webhook)
router.post('/eskhata/callback', async (req, res) => {
    try {
        const { status, data } = req.body;
        console.log(`[Eskhata Callback] Received webhook:`, JSON.stringify(req.body));

        if (!data || !data.invoiceId || !data.orderId) {
            return res.json({ status: false, code: -2, message: 'Invalid webhook parameters' });
        }

        const invoiceId = data.invoiceId;
        const orderId = data.orderId;

        // Find the payment request in our database
        const paymentRequest = await prisma.paymentRequest.findUnique({
            where: { id: invoiceId },
            include: { user: true }
        });

        if (!paymentRequest) {
            return res.json({ status: false, code: -1, message: 'Order not found' });
        }

        if (paymentRequest.status === 'APPROVED') {
            console.log(`[Eskhata Callback] Order ${invoiceId} already approved (duplicate webhook).`);
            return res.json({ status: true, code: 1, message: 'Дублирование запроса' });
        }

        // Verify transaction status directly via Eskhata status check API
        const eskhataApiUrl = process.env.ESKHATA_API_URL || 'https://sandbox.eskhata.tj';
        const companyIdBase64 = Buffer.from(process.env.ESKHATA_COMPANY_ID || 'test_company').toString('base64');
        const hashKey = process.env.ESKHATA_HASH_KEY || 'test_hash_key';
        const posIdStr = String(process.env.ESKHATA_POS_ID || '0');
        const amountStr = "30.00";
        const currencyStr = "972";

        // Hashing string for status check: invoiceId + orderId + amount + currency + posId + "." + HashKey
        const statusHash = generateEskhataHash([invoiceId, orderId, amountStr, currencyStr, posIdStr], hashKey);

        try {
            console.log(`[Eskhata Callback] Verifying status for order ${orderId} (invoice: ${invoiceId})`);
            const verifyRes = await axios.post(`${eskhataApiUrl}/merchant/api/v1/orders/status`, {
                hash: statusHash,
                invoiceId,
                orderId,
                amount: 30.00,
                currency: currencyStr,
                posId: Number(posIdStr)
            }, {
                headers: {
                    'X-CompanyId': companyIdBase64,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            const verifyData = verifyRes.data;
            if (verifyData && verifyData.status === true && verifyData.data && verifyData.data.orderStatus === 'COMPLETED') {
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 90);

                // Update database: Approve payment and activate Premium
                await prisma.$transaction([
                    prisma.paymentRequest.update({
                        where: { id: invoiceId },
                        data: {
                            status: 'APPROVED',
                            transactionId: String(orderId)
                        }
                    }),
                    prisma.user.update({
                        where: { id: paymentRequest.userId },
                        data: {
                            isPremium: true,
                            subscriptionExpiresAt: expiresAt
                        }
                    })
                ]);

                console.log(`[Eskhata Callback] Premium activated successfully for user ${paymentRequest.userId}`);

                const user = paymentRequest.user;

                // Notify User via Bot
                if (BOT_TOKEN && user.telegramId) {
                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        chat_id: user.telegramId.toString(),
                        text: `🎉 *Поздравляем! Ваш Premium активирован!* 🎉\n\nВаша оплата через *Eskhata Pay* на сумму *30 TJS* была успешно проведена.\n\nТеперь у вас есть безлимитный доступ ко всем функциям на 90 дней. Приятного аппетита! 🍏`,
                        parse_mode: 'Markdown'
                    }).catch(err => console.error('[Eskhata Notification] Failed to notify user:', err.message));
                }

                // Notify Admin via Bot
                if (BOT_TOKEN && user.telegramId) {
                    const ADMIN_TG_ID = "7179785109";
                    const userLine = user.username ? `@${user.username}` : user.firstName || 'User';
                    const phoneLine = user.phoneNumber ? `📱 Телефон: \`${user.phoneNumber}\`\n` : '';
                    const profileLink = `tg://user?id=${user.telegramId}`;

                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        chat_id: ADMIN_TG_ID,
                        text: `✅ *Новая оплата через Eskhata Pay!*\n\n` +
                            `👤 Клиент: [${userLine}](${profileLink})\n` +
                            `${phoneLine}` +
                            `🆔 ID: \`${user.telegramId}\`\n` +
                            `💰 Сумма: *30 TJS*\n` +
                            `📄 Транзакция Eskhata: \`${orderId}\`\n\n` +
                            `✨ Премиум активирован автоматически на 3 месяца.`,
                        parse_mode: 'Markdown'
                    }).catch(err => console.error('[Eskhata Admin Notification] Failed to notify admin:', err.message));
                }

                return res.json({ status: true, code: 0, message: 'Успешно' });
            } else {
                console.warn(`[Eskhata Callback] Status verification failed or order not completed:`, verifyData);
                return res.json({ status: false, code: -2, message: 'Order status verification failed' });
            }
        } catch (verifyError: any) {
            console.error(`[Eskhata Callback] Status verification request failed:`, verifyError.response?.data || verifyError.message);
            return res.json({ status: false, code: -6, message: 'Failed to verify transaction with Eskhata' });
        }
    } catch (error: any) {
        console.error('[Eskhata Callback] Webhook handler error:', error);
        res.json({ status: false, code: -6, message: 'Internal server error' });
    }
});

export default router;
