import crypto from 'crypto';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export function validateTelegramData(initData: string): TelegramUser | null {
  try {
    const BOT_TOKEN = process.env.BOT_TOKEN;
    if (!BOT_TOKEN) throw new Error('BOT_TOKEN not configured');

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Dev Bypass
    if (process.env.NODE_ENV !== 'production' && hash === 'mock') {
      const userParam = urlParams.get('user');
      if (userParam) return JSON.parse(userParam);
    }

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (computedHash !== hash) return null;

    const userParam = urlParams.get('user');
    if (!userParam) return null;

    return JSON.parse(userParam);
  } catch (error) {
    console.error('Telegram validation error:', error);
    return null;
  }
}
