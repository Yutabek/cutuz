import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

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
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
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
}
