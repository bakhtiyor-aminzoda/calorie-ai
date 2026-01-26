
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = 'https://43a609d11eb8.ngrok-free.app/api/webhooks/telegram';

async function main() {
    if (!BOT_TOKEN) {
        console.error('❌ BOT_TOKEN is missing');
        return;
    }
    try {
        console.log(`Setting webhook to: ${WEBHOOK_URL}`);
        const res = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
            url: WEBHOOK_URL
        });
        console.log('Response:', res.data);
    } catch (e: any) {
        console.error('Error setting webhook:', e.response?.data || e.message);
    }
}

main();
