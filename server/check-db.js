const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

try {
  const dbPath = process.env.DB_PATH || './data/pondo.db';
  console.log('DB Path:', dbPath);
  
  const db = new Database(dbPath);
  console.log('Database opened successfully');
  
  // Check if tables exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', tables);
  
  // Check settings table
  try {
    const settings = db.prepare('SELECT * FROM settings').all();
    console.log('Settings:', settings);
  } catch (err) {
    console.log('Error reading settings:', err.message);
  }
  
  db.close();
} catch (err) {
  console.error('Database error:', err);
}