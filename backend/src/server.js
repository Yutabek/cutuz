import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { initDb, get, pool, run } from './db.js';
import { createBot } from './bot.js';
import { notifyAdmin } from './notify.js';
import { validateTelegramInitData, verifyTelegramInitData } from './telegramAuth.js';

dotenv.config();
dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)) });

const app = express();
const PORT = Number(process.env.PORT || 4000);
const FRONTEND_DEV_URL = process.env.FRONTEND_DEV_URL || 'http://localhost:5173';
const WEBAPP_URL = process.env.WEBAPP_URL || FRONTEND_DEV_URL;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const allowedOrigins = [
  WEBAPP_URL,
  FRONTEND_DEV_URL,
  'https://cutuz-frontend.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
]
  .filter(Boolean)
  .map((url) => url.replace(/\/$/, ''));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.replace(/\/$/, '');

      if (allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

const bot = createBot({ token: process.env.BOT_TOKEN, webAppUrl: WEBAPP_URL });

function parseJsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  if (typeof value !== 'string') return fallback;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
}

function mapBarber(row) {
  return {
    ...row,
    services: parseJsonArray(row.services),
    portfolio: parseJsonArray(row.portfolio),
    reviews: parseJsonArray(row.reviews)
  };
}

function normalizeServicesInput(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (!value) return [];

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // Keep comma-separated input support for the simple MVP form.
    }

    return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function selectBarberProfileSql(whereClause) {
  return `
    SELECT
      id,
      telegram_id,
      username,
      name,
      phone,
      area,
      status,
      is_active,
      rating,
      experience_years,
      starting_price,
      services,
      bio,
      instagram,
      location_url,
      photo_url,
      portfolio,
      reviews
    FROM barbers
    WHERE ${whereClause}
  `;
}

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/api/auth/telegram', async (req, res) => {
  try {
    const { initData, role = 'user', phone } = req.body;

    if (!phone || phone.trim().length < 9) {
      return res.status(400).json({ error: 'Telefon raqam majburiy' });
    }

    const safeRole = role === 'barber' ? 'barber' : 'user';
    const tgUser = verifyTelegramInitData(initData, process.env.BOT_TOKEN);

    if (!tgUser?.id) {
      return res.status(401).json({ error: 'Telegram auth failed' });
    }

    const userResult = await pool.query(
      `
      INSERT INTO users (telegram_id, username, first_name, last_name, phone, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (telegram_id)
      DO UPDATE SET
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        role = CASE
          WHEN users.role = 'admin' THEN 'admin'
          ELSE EXCLUDED.role
        END
      RETURNING *
      `,
      [
        tgUser.id,
        tgUser.username || null,
        tgUser.first_name || null,
        tgUser.last_name || null,
        phone.trim(),
        safeRole,
      ]
    );

    const user = userResult.rows[0];

    if (safeRole === 'barber') {
      const fullName =
        [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') ||
        tgUser.username ||
        'New Barber';

      await pool.query(
        `
        INSERT INTO barbers (
          telegram_id,
          username,
          name,
          phone,
          area,
          rating,
          experience_years,
          starting_price,
          services,
          portfolio,
          reviews,
          status,
          is_active
        )
        VALUES ($1, $2, $3, $4, '', 0, 0, 0, '', '[]', '[]', 'pending', 0)
        ON CONFLICT (telegram_id)
        DO UPDATE SET
          username = EXCLUDED.username,
          phone = EXCLUDED.phone
        `,
        [tgUser.id, tgUser.username || null, fullName, phone.trim()]
      );
    }

    return res.json({
      ok: true,
      user,
    });
  } catch (error) {
    console.error('POST /api/auth/telegram error:', error);
    const isAuthError =
      error.message?.includes('Telegram') ||
      error.message?.includes('initData') ||
      error.message?.includes('hash');

    return res.status(isAuthError ? 401 : 500).json({
      error: isAuthError ? 'Telegram auth failed' : 'Kirishda xatolik yuz berdi',
    });
  }
});

app.get('/api/barbers', async (req, res, next) => {
  try {
    const { area, service, q } = req.query;
    const params = [];
    const where = ['status = $1', 'is_active = 1'];
    params.push('approved');

    if (area && area !== 'all' && area !== 'Hammasi') {
      params.push(area);
      where.push(`area = $${params.length}`);
    }
    if (service && service !== 'all' && service !== 'Hammasi') {
      params.push(`%${service}%`);
      where.push(`services::text ILIKE $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      where.push(`(name ILIKE $${params.length} OR bio ILIKE $${params.length} OR area ILIKE $${params.length} OR services::text ILIKE $${params.length})`);
    }

    const sql = `
      SELECT
        id,
        name,
        area,
        rating,
        experience_years,
        starting_price,
        services,
        bio,
        instagram,
        location_url,
        photo_url,
        portfolio,
        reviews
      FROM barbers
      WHERE ${where.join(' AND ')}
      ORDER BY rating DESC NULLS LAST, starting_price ASC NULLS LAST, id DESC
      LIMIT 50
    `;

    const result = await pool.query(sql, params);
    res.json({ ok: true, data: result.rows.map(mapBarber) });
  } catch (err) { next(err); }
});

app.get('/api/barbers/me', async (req, res, next) => {
  try {
    const telegramId = req.query.telegram_id;

    if (!telegramId) {
      return res.status(400).json({ error: 'telegram_id is required' });
    }

    const result = await pool.query(
      selectBarberProfileSql('telegram_id = $1 LIMIT 1'),
      [telegramId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Barber profile not found' });
    }

    return res.json({ ok: true, data: mapBarber(result.rows[0]) });
  } catch (err) { next(err); }
});

const barberProfileSchema = z.object({
  telegram_id: z.coerce.number(),
  name: z.string().min(2).nullable().optional(),
  area: z.string().nullable().optional(),
  services: z.union([z.string(), z.array(z.string())]).optional(),
  starting_price: z.coerce.number().min(0).optional(),
  experience_years: z.coerce.number().min(0).optional(),
  bio: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  location_url: z.string().nullable().optional(),
  photo_url: z.string().nullable().optional(),
});

app.patch('/api/barbers/me', async (req, res, next) => {
  try {
    const data = barberProfileSchema.parse(req.body);
    const updates = [];
    const params = [];

    const assign = (column, value) => {
      params.push(value);
      updates.push(`${column} = $${params.length}`);
    };

    if (data.name !== undefined) assign('name', data.name?.trim() || 'New Barber');
    if (data.area !== undefined) assign('area', data.area?.trim() || '');
    if (data.services !== undefined) assign('services', JSON.stringify(normalizeServicesInput(data.services)));
    if (data.starting_price !== undefined) assign('starting_price', data.starting_price);
    if (data.experience_years !== undefined) assign('experience_years', data.experience_years);
    if (data.bio !== undefined) assign('bio', data.bio?.trim() || null);
    if (data.instagram !== undefined) assign('instagram', data.instagram?.trim() || null);
    if (data.location_url !== undefined) assign('location_url', data.location_url?.trim() || null);
    if (data.photo_url !== undefined) assign('photo_url', data.photo_url?.trim() || null);

    if (!updates.length) {
      return res.status(400).json({ error: 'No profile fields to update' });
    }

    params.push(data.telegram_id);

    const result = await pool.query(
      `
      UPDATE barbers
      SET ${updates.join(', ')}
      WHERE telegram_id = $${params.length}
      RETURNING
        id,
        telegram_id,
        username,
        name,
        phone,
        area,
        status,
        is_active,
        rating,
        experience_years,
        starting_price,
        services,
        bio,
        instagram,
        location_url,
        photo_url,
        portfolio,
        reviews
      `,
      params
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Barber profile not found' });
    }

    return res.json({ ok: true, data: mapBarber(result.rows[0]) });
  } catch (err) { next(err); }
});

app.patch('/api/admin/barbers/:id/approve', async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      UPDATE barbers
      SET status = 'approved', is_active = 1
      WHERE id = $1
      RETURNING
        id,
        telegram_id,
        username,
        name,
        phone,
        area,
        status,
        is_active,
        rating,
        experience_years,
        starting_price,
        services,
        bio,
        instagram,
        location_url,
        photo_url,
        portfolio,
        reviews
      `,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Barber not found' });
    }

    return res.json({ ok: true, data: mapBarber(result.rows[0]) });
  } catch (err) { next(err); }
});

app.patch('/api/admin/barbers/:id/reject', async (req, res, next) => {
  try {
    await pool.query('UPDATE barbers SET status = $1, is_active = 0 WHERE id = $2', ['rejected', req.params.id]);
    const result = await pool.query(selectBarberProfileSql('id = $1'), [req.params.id]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Barber not found' });
    }

    return res.json({ ok: true, data: mapBarber(result.rows[0]) });
  } catch (err) { next(err); }
});

app.get('/api/barbers/:id', async (req, res, next) => {
  try {
    const row = await get('SELECT * FROM barbers WHERE id = ? AND status = ? AND is_active = 1', [req.params.id, 'approved']);
    if (!row) return res.status(404).json({ error: 'Barber not found' });
    await run('INSERT INTO events (telegram_user_id, event_name, payload) VALUES (?, ?, ?)', [req.query.tgUserId || null, 'barber_profile_view', JSON.stringify({ barberId: req.params.id })]);
    res.json(mapBarber(row));
  } catch (err) { next(err); }
});

const bookingSchema = z.object({
  initData: z.string().optional(),
  telegramUserId: z.string().optional(),
  telegramUsername: z.string().optional(),
  barberId: z.coerce.number(),
  service: z.string().min(2),
  date: z.string().min(4),
  time: z.string().min(2),
  customerName: z.string().min(2),
  phone: z.string().min(7),
  comment: z.string().optional()
});

app.post('/api/bookings', async (req, res, next) => {
  try {
    const body = {
      ...req.body,
      telegramUserId: req.body.telegramUserId || req.body.telegram_user_id,
      telegramUsername: req.body.telegramUsername || req.body.telegram_username,
      barberId: req.body.barberId || req.body.barber_id,
      service: req.body.service,
      date: req.body.date || req.body.booking_date,
      time: req.body.time || req.body.booking_time,
      customerName: req.body.customerName || req.body.customer_name,
    };
    const data = bookingSchema.parse(body);
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
  startingPrice: z.coerce.number().optional(),
  instagram: z.string().optional(),
  comment: z.string().optional()
});

app.post('/api/barber-applications', async (req, res, next) => {
  try {
    const data = barberApplicationSchema.parse({
      ...req.body,
      startingPrice: req.body.startingPrice || req.body.starting_price,
    });
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
