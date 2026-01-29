import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const router = Router();
const prisma = new PrismaClient();
const BOT_TOKEN = process.env.BOT_TOKEN;

router.post('/telegram', async (req, res) => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  WEBHOOK HANDLER CALLED                ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('Received at:', new Date().toISOString());
    console.log('Full body:', JSON.stringify(req.body, null, 2));
    
    const { callback_query } = req.body;

    if (!callback_query) {
        console.log('No callback_query in payload, returning 200');
        return res.sendStatus(200);
    }

    const { data, message, from } = callback_query;
    const chatId = from.id; // Admin's chat ID
    const messageId = message.message_id;

    console.log(`✓ Processing callback: ${data} from ${chatId}`);
    console.log(`✓ Message ID: ${messageId}`);

    const [action, ...params] = data.split(':');
    console.log(`✓ Action: ${action}, Params:`, params);

    // Optimization: Answer immediately to prevent loading spinner
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        callback_query_id: callback_query.id,
        text: '⏳ Обработка...',
        show_alert: false
    }).catch(e => console.error('❌ Failed to answer callback:', e.message));

    try {
        if (action === 'approve') {
            const requestId = params[0];
            console.log(`\n📌 APPROVE ACTION - Request ID: ${requestId}`);
            
            const request = await prisma.paymentRequest.findUnique({
                where: { id: requestId }
            });

            if (!request) {
                console.error(`❌ Request ${requestId} not found in DB`);
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                    callback_query_id: callback_query.id,
                    text: '❌ Запрос не найден',
                    show_alert: true
                }).catch(e => console.error('Failed to answer:', e.message));
                return res.sendStatus(200);
            }
            
            console.log(`✓ Found request, current status: ${request.status}`);
            
            if (request.status !== 'PENDING') {
                console.log(`⚠️ Request ${requestId} already processed: ${request.status}`);
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                    callback_query_id: callback_query.id,
                    text: `⚠️ Запрос уже обработан (${request.status})`,
                    show_alert: true
                }).catch(e => console.error('Failed to answer:', e.message));
                return res.sendStatus(200);
            }

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 90);

            console.log(`✓ Updating DB - Premium expires: ${expiresAt}`);
            
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
            
            console.log(`✓ DB updated successfully`);

            // Notify User
            const user = await prisma.user.findUnique({ where: { id: request.userId } });
            if (user && user.telegramId) {
                console.log(`✓ Notifying user ${user.telegramId} of approval...`);
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    chat_id: user.telegramId.toString(),
                    text: `🌟 *Поздравляем! Ваш Premium активирован!* 🌟\n\nТеперь у вас есть безлимитный доступ ко всем функциям на 90 дней. Приятного аппетита!`,
                    parse_mode: 'Markdown'
                }).catch(err => console.error('❌ Failed to notify user of approval:', err.message));
            }

            console.log(`✓ Updating admin's message...`);
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageCaption`, {
                chat_id: chatId,
                message_id: messageId,
                caption: `${message.caption || ''}\n\n✅ *ОДОБРЕНО!* Пользователь получил Premium.`,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: [] }  // Remove buttons
            }).catch(e => console.error('❌ Failed to edit caption:', e.message));
            
            console.log(`✅ APPROVE COMPLETED SUCCESSFULLY`);
        }
        else if (action === 'reject') {
            const reason = params[0]; // no_image or no_funds
            const requestId = params[1];
            
            console.log(`\n📌 REJECT ACTION - Request ID: ${requestId}, Reason: ${reason}`);

            const request = await prisma.paymentRequest.findUnique({
                where: { id: requestId }
            });

            if (!request) {
                console.error(`❌ Request ${requestId} not found in DB`);
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                    callback_query_id: callback_query.id,
                    text: '❌ Запрос не найден',
                    show_alert: true
                }).catch(e => console.error('Failed to answer:', e.message));
                return res.sendStatus(200);
            }

            if (request.status !== 'PENDING') {
                console.log(`⚠️ Request ${requestId} already processed: ${request.status}`);
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                    callback_query_id: callback_query.id,
                    text: `⚠️ Запрос уже обработан (${request.status})`,
                    show_alert: true
                }).catch(e => console.error('Failed to answer:', e.message));
                return res.sendStatus(200);
            }

            await prisma.paymentRequest.update({
                where: { id: requestId },
                data: { status: 'REJECTED' }
            }).catch(e => {
                console.error(`❌ Failed to update request:`, e.message);
            });
            
            console.log(`✓ Request marked as REJECTED`);

            const reasonText = reason === 'no_image' ? 'Нечеткий или отсутствующий скриншот' : 'Оплата не найдена в истории';

            // Notify User
            const user = await prisma.user.findUnique({ where: { id: request.userId } });
            if (user && user.telegramId) {
                console.log(`✓ Notifying user ${user.telegramId} of rejection...`);
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    chat_id: user.telegramId.toString(),
                    text: `⚠️ *Оплата отклонена*\n\nПричина: ${reasonText}\n\nПожалуйста, отправьте корректный чек в меню Premium ещё раз.`,
                    parse_mode: 'Markdown'
                }).catch(err => console.error('❌ Failed to notify user of rejection:', err.message));
            }

            console.log(`✓ Updating admin's message...`);
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageCaption`, {
                chat_id: chatId,
                message_id: messageId,
                caption: `${message.caption || ''}\n\n❌ *ОТКЛОНЕНО.*\nПричина: ${reasonText}`,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: [] }  // Remove buttons
            }).catch(e => console.error('❌ Failed to edit caption:', e.message));
            
            console.log(`✅ REJECT COMPLETED SUCCESSFULLY`);
        }

    } catch (error: any) {
        console.error('\n❌ WEBHOOK ERROR:', error.message);
        console.error('Stack:', error.stack);
    }

    res.sendStatus(200);
});

export default router;
