import crypto from 'node:crypto';

export function verifyTelegramInitData(initData, botToken) {
  if (!initData) {
    if (process.env.NODE_ENV !== 'production') {
      return {
        id: 999001,
        username: 'dev_user',
        first_name: 'Dev',
        last_name: 'User',
      };
    }

    throw new Error('Missing Telegram initData');
  }

  if (!botToken) {
    throw new Error('Missing BOT_TOKEN');
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');

  if (!hash) {
    throw new Error('Missing Telegram hash');
  }

  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const calculated = Buffer.from(calculatedHash, 'hex');
  const received = Buffer.from(hash, 'hex');

  if (calculated.length !== received.length || !crypto.timingSafeEqual(calculated, received)) {
    throw new Error('Invalid Telegram initData');
  }

  const userRaw = params.get('user');

  if (!userRaw) {
    throw new Error('Telegram user missing');
  }

  return JSON.parse(userRaw);
}

export function validateTelegramInitData(initData, botToken) {
  try {
    return { ok: true, user: verifyTelegramInitData(initData, botToken) };
  } catch {
    return { ok: false, user: null };
  }
}
