import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export function openDatabase(databasePath) {
  const resolvedPath = resolve(databasePath);
  mkdirSync(dirname(resolvedPath), { recursive: true });

  const db = new DatabaseSync(resolvedPath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role = 'admin'),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY,
      registration_kind TEXT NOT NULL CHECK (registration_kind IN ('membership', 'formation')),
      activity_key TEXT NOT NULL,
      activity_name TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      normalized_phone TEXT NOT NULL,
      email TEXT,
      answers_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'rejected')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (activity_key, normalized_phone)
    );

    CREATE TABLE IF NOT EXISTS donation_intents (
      id INTEGER PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      normalized_phone TEXT NOT NULL,
      amount_xaf INTEGER NOT NULL CHECK (amount_xaf >= 100),
      operator TEXT NOT NULL CHECK (operator = 'MTN Mobile Money'),
      status TEXT NOT NULL DEFAULT 'pending_provider'
        CHECK (status IN ('pending_provider', 'pending', 'succeeded', 'failed')),
      provider_reference TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS idempotency_requests (
      idempotency_key TEXT PRIMARY KEY,
      request_type TEXT NOT NULL CHECK (request_type IN ('registration', 'donation')),
      request_hash TEXT NOT NULL,
      resource_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS registrations_status_id
      ON registrations(status, id DESC);
    CREATE INDEX IF NOT EXISTS donations_status_id
      ON donation_intents(status, id DESC);
  `);

  return db;
}
