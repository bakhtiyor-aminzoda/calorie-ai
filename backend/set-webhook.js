const axios = require('axios');
require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const BACKEND_URL = 'https://calorie-ai.onrender.com'; // Твой Render URL

async function setWebhook() {
  try {
    const webhookUrl = `${BACKEND_URL}/api/webhooks/telegram`;
    
    console.log(`Setting webhook to: ${webhookUrl}`);
    
    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      { url: webhookUrl }
    );
    
    console.log('Response:', response.data);
    
    if (response.data.ok) {
      console.log('✅ Webhook установлен успешно!');
    } else {
      console.error('❌ Ошибка:', response.data.description);
    }
    
    // Проверка установленного webhook
    const info = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
    );
    console.log('\nТекущий webhook:', info.data.result);
    
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

setWebhook();
