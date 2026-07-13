// Database schema for Pondo Household Expense Tracker
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize database — honor DB_PATH (relative to the server/ working directory), matching .env.example
const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || 'data/pondo.db');
const db = new sqlite3.Database(dbPath);

// Create tables if they don't exist
db.serialize(() => {
  // Enforce foreign key constraints (must be set per-connection; SQLite defaults this off)
  db.run('PRAGMA foreign_keys = ON');

  // Create accounts table
  db.run(`CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('debit', 'credit', 'lent', 'borrowed', 'invest')),
    description TEXT,
    emoji TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create categories table
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    color TEXT,
    icon TEXT DEFAULT NULL,
    is_default BOOLEAN DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create entries table
  db.run(`CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    amount REAL NOT NULL,
    account_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    note TEXT,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts (id),
    FOREIGN KEY (category_id) REFERENCES categories (id)
  )`);

  // Create settings table (key/value store for app config)
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  // Add indexes for better performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_entries_account_id ON entries(account_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_entries_category_id ON entries(category_id)`);

  // Add emoji column to accounts table if it doesn't exist (migration)
  db.run(`ALTER TABLE accounts ADD COLUMN emoji TEXT DEFAULT NULL`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding emoji column to accounts:', err.message);
    }
  });
});

module.exports = db;