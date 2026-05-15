import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { z } from 'zod';
import { initDb, all, get, run } from './db.js';
import { createBot } from './bot.js';
import { notifyAdmin } from './notify.js';
import { validateTelegramInitData } from './telegramAuth.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);
const FRONTEND_DEV_URL = process.env.FRONTEND_DEV_URL || 'http://localhost:5173';
const WEBAPP_URL = process.env.WEBAPP_URL || FRONTEND_DEV_URL;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: [FRONTEND_DEV_URL, WEBAPP_URL], credentials: true }));
app.use(express.json({ limit: '1mb' }));

const bot = createBot({ token: process.env.BOT_TOKEN, webAppUrl: WEBAPP_URL });

function parseJsonArray(value, fallback = []) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

function mapBarber(row) {
  return {
    ...row,
    services: parseJsonArray(row.services),
    portfolio: parseJsonArray(row.portfolio),
    reviews: parseJsonArray(row.reviews)
  };
}

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/api/auth/telegram', (req, res) => {
  const { initData } = req.body;
  const result = validateTelegramInitData(initData, process.env.BOT_TOKEN);
  res.json(result);
});

app.get('/api/barbers', async (req, res, next) => {
  try {
    const { area, service, q } = req.query;
    const params = [];
    let sql = 'SELECT * FROM barbers WHERE is_active = 1';

    if (area && area !== 'all') {
      sql += ' AND area = ?';
      params.push(area);
    }
    if (service && service !== 'all') {
      sql += ' AND services LIKE ?';
      params.push(`%${service}%`);
    }
    if (q) {
      sql += ' AND (name LIKE ? OR bio LIKE ? OR area LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    sql += ' ORDER BY rating DESC, starting_price ASC';

    const rows = await all(sql, params);
    res.json(rows.map(mapBarber));
  } catch (err) { next(err); }
});

app.get('/api/barbers/:id', async (req, res, next) => {
  try {
    const row = await get('SELECT * FROM barbers WHERE id = ? AND is_active = 1', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Barber not found' });
    await run('INSERT INTO events (telegram_user_id, event_name, payload) VALUES (?, ?, ?)', [req.query.tgUserId || null, 'barber_profile_view', JSON.stringify({ barberId: req.params.id })]);
    res.json(mapBarber(row));
  } catch (err) { next(err); }
});

const bookingSchema = z.object({
  initData: z.string().optional(),
  telegramUserId: z.string().optional(),
  telegramUsername: z.string().optional(),
  barberId: z.number(),
  service: z.string().min(2),
  date: z.string().min(4),
  time: z.string().min(2),
  customerName: z.string().min(2),
  phone: z.string().min(7),
  comment: z.string().optional()
});

app.post('/api/bookings', async (req, res, next) => {
  try {
    const data = bookingSchema.parse(req.body);
    const barber = await get('SELECT * FROM barbers WHERE id = ? AND is_active = 1', [data.barberId]);
    if (!barber) return res.status(404).json({ error: 'Barber not found' });

    let tgUser = null;
    if (data.initData) {
      const auth = validateTelegramInitData(data.initData, process.env.BOT_TOKEN);
      if (auth.ok) tgUser = auth.user;
    }

    const tgId = tgUser?.id?.toString() || data.telegramUserId || null;
    const tgUsername = tgUser?.username || data.telegramUsername || null;

    const result = await run(`INSERT INTO bookings
      (telegram_user_id, telegram_username, barber_id, barber_name, service, date, time, customer_name, phone, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tgId, tgUsername, barber.id, barber.name, data.service, data.date, data.time, data.customerName, data.phone, data.comment || null]
    );

    await run('INSERT INTO events (telegram_user_id, event_name, payload) VALUES (?, ?, ?)', [tgId, 'booking_request_created', JSON.stringify({ bookingId: result.id, barberId: barber.id })]);

    await notifyAdmin(bot, ADMIN_CHAT_ID,
      `🆕 <b>New booking request</b>\n\n` +
      `👤 Customer: ${data.customerName}\n` +
      `📱 Phone: ${data.phone}\n` +
      `💈 Barber: ${barber.name}\n` +
      `🧾 Service: ${data.service}\n` +
      `📅 Date: ${data.date}\n` +
      `🕒 Time: ${data.time}\n` +
      `📍 Area: ${barber.area}\n` +
      `🔗 Telegram: ${tgUsername ? '@' + tgUsername : tgId || 'unknown'}\n` +
      `💬 Comment: ${data.comment || '-'}\n\n` +
      `Status: waiting_confirmation`
    );

    res.status(201).json({ id: result.id, status: 'waiting_confirmation' });
  } catch (err) { next(err); }
});

app.get('/api/bookings/latest', async (req, res, next) => {
  try {
    const tgUserId = req.query.telegramUserId;
    if (!tgUserId) return res.status(400).json({ error: 'telegramUserId is required' });
    const booking = await get('SELECT * FROM bookings WHERE telegram_user_id = ? ORDER BY id DESC LIMIT 1', [tgUserId]);
    res.json(booking || null);
  } catch (err) { next(err); }
});

const barberApplicationSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  area: z.string().min(2),
  services: z.string().min(2),
  startingPrice: z.number().optional(),
  instagram: z.string().optional(),
  comment: z.string().optional()
});

app.post('/api/barber-applications', async (req, res, next) => {
  try {
    const data = barberApplicationSchema.parse(req.body);
    const result = await run(`INSERT INTO barber_applications
      (name, phone, area, services, starting_price, instagram, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.name, data.phone, data.area, data.services, data.startingPrice || null, data.instagram || null, data.comment || null]
    );

    await notifyAdmin(bot, ADMIN_CHAT_ID,
      `🧔 <b>New barber application</b>\n\n` +
      `Name: ${data.name}\n` +
      `Phone: ${data.phone}\n` +
      `Area: ${data.area}\n` +
      `Services: ${data.services}\n` +
      `Starting price: ${data.startingPrice || '-'}\n` +
      `Instagram: ${data.instagram || '-'}\n` +
      `Comment: ${data.comment || '-'}`
    );

    res.status(201).json({ id: result.id, status: 'new' });
  } catch (err) { next(err); }
});

app.post('/api/events', async (req, res, next) => {
  try {
    const { telegramUserId, eventName, payload } = req.body;
    if (!eventName) return res.status(400).json({ error: 'eventName is required' });
    await run('INSERT INTO events (telegram_user_id, event_name, payload) VALUES (?, ?, ?)', [telegramUserId || null, eventName, JSON.stringify(payload || {})]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation error', details: err.errors });
  res.status(500).json({ error: 'Internal server error' });
});

await initDb();

if (bot) {
  bot.launch().then(() => console.log('Telegram bot started')).catch((err) => console.error('Bot launch failed:', err.message));
}

app.listen(PORT, () => console.log(`API server running on port ${PORT}`));

process.once('SIGINT', () => bot?.stop('SIGINT'));
process.once('SIGTERM', () => bot?.stop('SIGTERM'));
