import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config();
dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)) });

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

function convertSqlitePlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

export const run = async (sql, params = []) => {
  const convertedSql = convertSqlitePlaceholders(sql);
  const result = await pool.query(convertedSql, params);

  return {
    id: result.rows?.[0]?.id || null,
    changes: result.rowCount,
    rows: result.rows,
  };
};

export const all = async (sql, params = []) => {
  const convertedSql = convertSqlitePlaceholders(sql);
  const result = await pool.query(convertedSql, params);
  return result.rows;
};

export const get = async (sql, params = []) => {
  const convertedSql = convertSqlitePlaceholders(sql);
  const result = await pool.query(convertedSql, params);
  return result.rows[0];
};

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      telegram_id BIGINT UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS barbers (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      area TEXT NOT NULL,
      rating NUMERIC DEFAULT 0,
      experience_years INTEGER DEFAULT 0,
      starting_price INTEGER NOT NULL,
      services TEXT NOT NULL,
      bio TEXT,
      instagram TEXT,
      location_url TEXT,
      photo_url TEXT,
      portfolio TEXT,
      reviews TEXT,
      status TEXT DEFAULT 'pending',
      is_active INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE barbers
      ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE,
      ADD COLUMN IF NOT EXISTS username TEXT,
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()
  `);

  await pool.query(`
    UPDATE barbers
    SET status = 'pending'
    WHERE status IS NULL OR TRIM(status) = ''
  `);

  await pool.query(`
    UPDATE barbers
    SET status = 'pending'
    WHERE status NOT IN ('pending', 'approved', 'rejected')
  `);

  await pool.query(`
    ALTER TABLE barbers
      ALTER COLUMN status SET DEFAULT 'pending',
      ALTER COLUMN is_active SET DEFAULT 0
  `);

  await pool.query('ALTER TABLE barbers DROP CONSTRAINT IF EXISTS barbers_status_check');
  await pool.query(`
    ALTER TABLE barbers
      ADD CONSTRAINT barbers_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'))
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id BIGSERIAL PRIMARY KEY,
      telegram_user_id TEXT,
      telegram_username TEXT,
      barber_id BIGINT NOT NULL REFERENCES barbers(id),
      barber_name TEXT NOT NULL,
      service TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      comment TEXT,
      status TEXT DEFAULT 'waiting_confirmation',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS barber_applications (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      area TEXT NOT NULL,
      services TEXT NOT NULL,
      starting_price INTEGER,
      instagram TEXT,
      comment TEXT,
      status TEXT DEFAULT 'new',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id BIGSERIAL PRIMARY KEY,
      telegram_user_id TEXT,
      event_name TEXT NOT NULL,
      payload TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_barbers_telegram_id ON barbers(telegram_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_barbers_status_active ON barbers(status, is_active)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_barber_time ON bookings(barber_id, date, time)');
}
