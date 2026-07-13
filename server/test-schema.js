const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './data/pondo.db';
console.log('DB Path:', dbPath);

const db = new Database(dbPath);
console.log('Database opened successfully');

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON');

// Check existing tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Existing tables:', tables);

// Check if settings table exists
const settingsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").get();
console.log('Settings table exists:', !!settingsTable);

if (settingsTable) {
  // Check settings data
  try {
    const settings = db.prepare('SELECT * FROM settings').all();
    console.log('Settings data:', settings);
  } catch (err) {
    console.log('Error reading settings:', err.message);
  }
}

// Check if first_launch_completed setting exists
try {
  const firstLaunch = db.prepare('SELECT value FROM settings WHERE key = ?').get('first_launch_completed');
  console.log('First launch setting:', firstLaunch);
} catch (err) {
  console.log('Error reading first_launch_completed:', err.message);
}

db.close();