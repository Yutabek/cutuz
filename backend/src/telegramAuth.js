import crypto from 'node:crypto';

export function validateTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return { ok: false, user: null };

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { ok: false, user: null };

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  const ok = crypto.timingSafeEqual(Buffer.from(calculatedHash), Buffer.from(hash));

  let user = null;
  try {
    const rawUser = params.get('user');
    user = rawUser ? JSON.parse(rawUser) : null;
  } catch {
    user = null;
  }

  return { ok, user };
}
