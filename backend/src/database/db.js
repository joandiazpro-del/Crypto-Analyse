const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/terminal.db');
const db = new Database(DB_PATH);

// Performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schéma
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    email        TEXT    UNIQUE NOT NULL,
    password_hash TEXT   NOT NULL,
    name         TEXT    NOT NULL DEFAULT '',
    plan         TEXT    NOT NULL DEFAULT 'free',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id         TEXT    PRIMARY KEY,
    symbol     TEXT    NOT NULL,
    type       TEXT    NOT NULL,
    value      REAL,
    label      TEXT    NOT NULL,
    active     INTEGER NOT NULL DEFAULT 1,
    repeat     INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS alert_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id     TEXT,
    symbol       TEXT NOT NULL,
    alert_type   TEXT NOT NULL,
    label        TEXT NOT NULL,
    triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
