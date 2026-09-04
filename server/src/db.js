import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATA_DIR = process.env.BAS_DATA_DIR || join(__dirname, '..', 'data');
mkdirSync(DATA_DIR, { recursive: true });

// Use an in-memory database for tests to keep runs isolated and fast.
const DB_PATH = process.env.BAS_DB_PATH || join(DATA_DIR, 'book-a-shoot.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS slots (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      photographer TEXT    NOT NULL,
      starts_at    TEXT    NOT NULL,
      duration_min INTEGER NOT NULL DEFAULT 60,
      location     TEXT    NOT NULL,
      UNIQUE (photographer, starts_at)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_id       INTEGER NOT NULL UNIQUE,
      customer_name TEXT    NOT NULL,
      email         TEXT    NOT NULL,
      shoot_type    TEXT    NOT NULL,
      notes         TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (slot_id) REFERENCES slots (id) ON DELETE CASCADE
    );
  `);
}

export default db;
