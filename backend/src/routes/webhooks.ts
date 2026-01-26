import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const router = Router();
const prisma = new PrismaClient();
const BOT_TOKEN = process.env.BOT_TOKEN;

router.post('/telegram', async (req, res) => {
    const { callback_query } = req.body;

    // Log for debugging
    if (req.body) {
        console.log('Webhook payload received:', JSON.stringify(req.body, null, 2));
    }

    if (!callback_query) return res.sendStatus(200);

    const { data, message, from } = callback_query;
    const chatId = from.id; // Admin's chat ID
    const messageId = message.message_id;

    console.log(`Processing callback: ${data} from ${chatId}`);

    const [action, ...params] = data.split(':');

    // Optimization: Answer immediately to prevent loading spinner
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        callback_query_id: callback_query.id,
        text: 'Обработка...'
    }).catch(e => console.error('Failed to answer callback:', e.message));

    try {
        if (action === 'approve') {
            const requestId = params[0];
            const request = await prisma.paymentRequest.findUnique({
                where: { id: requestId }
            });

            if (!request) {
                console.error(`Request ${requestId} not found`);
                return res.sendStatus(200);
            }
            if (request.status !== 'PENDING') {
                console.log(`Request ${requestId} already processed: ${request.status}`);
                return res.sendStatus(200);
            }

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

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

            // Notify User
            const user = await prisma.user.findUnique({ where: { id: request.userId } });
            if (user && user.telegramId) {
                console.log(`Notifying user ${user.telegramId} of approval...`);
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    chat_id: user.telegramId.toString(),
                    text: `🌟 *Поздравляем! Ваш Premium активирован!* 🌟\n\nТеперь у вас есть безлимитный доступ ко всем функциям на 30 дней. Приятного аппетита!`,
                    parse_mode: 'Markdown'
                }).catch(err => console.error('Failed to notify user of approval:', err.message));
            }

            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageCaption`, {
                chat_id: chatId,
                message_id: messageId,
                caption: `${message.caption || ''}\n\n✅ *ОДОБРЕНО!* Пользователь получил Premium.`,
                parse_mode: 'Markdown'
            }).catch(e => console.error('Failed to edit caption:', e.message));
        }
        else if (action === 'reject') {
            const reason = params[0]; // no_image or no_funds
            const requestId = params[1];

            const request = await prisma.paymentRequest.update({
                where: { id: requestId },
                data: { status: 'REJECTED' }
            }).catch(e => null); // Handle if not found

            if (!request) return res.sendStatus(200);

            const reasonText = reason === 'no_image' ? 'Нечеткий или отсутствующий скриншот' : 'Оплата не найдена в истории';

            // Notify User
            const user = await prisma.user.findUnique({ where: { id: request.userId } });
            if (user && user.telegramId) {
                console.log(`Notifying user ${user.telegramId} of rejection...`);
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    chat_id: user.telegramId.toString(),
                    text: `⚠️ *Оплата отклонена*\n\nПричина: ${reasonText}\n\nПожалуйста, отправьте корректный чек в меню Premium ещё раз.`,
                    parse_mode: 'Markdown'
                }).catch(err => console.error('Failed to notify user of rejection:', err.message));
            }

            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageCaption`, {
                chat_id: chatId,
                message_id: messageId,
                caption: `${message.caption || ''}\n\n❌ *ОТКЛОНЕНО.*\nПричина: ${reasonText}`,
                parse_mode: 'Markdown'
            }).catch(e => console.error('Failed to edit caption:', e.message));
        }

    } catch (error: any) {
        console.error('Webhook error:', error.message);
    }

    res.sendStatus(200);
});

export default router;
