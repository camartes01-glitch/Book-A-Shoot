import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const dataDir = join(__dirname, "..", "data");
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

export const DB_PATH = process.env.DB_PATH ?? join(dataDir, "book-a-shoot.db");

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS packages (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      slug           TEXT NOT NULL UNIQUE,
      name           TEXT NOT NULL,
      description    TEXT NOT NULL,
      price_cents    INTEGER NOT NULL,
      duration_min   INTEGER NOT NULL,
      emoji          TEXT NOT NULL DEFAULT '📷'
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id     INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
      customer_name  TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      session_date   TEXT NOT NULL,
      notes          TEXT NOT NULL DEFAULT '',
      status         TEXT NOT NULL DEFAULT 'confirmed',
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export interface PackageRow {
  id: number;
  slug: string;
  name: string;
  description: string;
  price_cents: number;
  duration_min: number;
  emoji: string;
}

export interface BookingRow {
  id: number;
  package_id: number;
  customer_name: string;
  customer_email: string;
  session_date: string;
  notes: string;
  status: string;
  created_at: string;
}
