import sqlite3 from 'sqlite3';
import { promisify } from 'node:util';
import dotenv from 'dotenv';

dotenv.config();

const dbFile = process.env.DATABASE_FILE || './barber_mvp.db';
export const db = new sqlite3.Database(dbFile);

export const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });

export const all = promisify(db.all.bind(db));
export const get = promisify(db.get.bind(db));

export async function initDb() {
  await run(`CREATE TABLE IF NOT EXISTS barbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    area TEXT NOT NULL,
    rating REAL DEFAULT 0,
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
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_user_id TEXT,
    telegram_username TEXT,
    barber_id INTEGER NOT NULL,
    barber_name TEXT NOT NULL,
    service TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    comment TEXT,
    status TEXT DEFAULT 'waiting_confirmation',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(barber_id) REFERENCES barbers(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS barber_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    area TEXT NOT NULL,
    services TEXT NOT NULL,
    starting_price INTEGER,
    instagram TEXT,
    comment TEXT,
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_user_id TEXT,
    event_name TEXT NOT NULL,
    payload TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
}
