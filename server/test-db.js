// Simple test to check database access
const fs = require('fs');
const path = require('path');

// Check if database file exists
const dbPath = './data/pondo.db';
console.log('Checking database file:', dbPath);

if (fs.existsSync(dbPath)) {
  console.log('Database file exists');
  const stats = fs.statSync(dbPath);
  console.log('File size:', stats.size, 'bytes');
} else {
  console.log('Database file does not exist');
}

// Try to read the first few bytes
try {
  const buffer = fs.readFileSync(dbPath, { length: 16 });
  console.log('First 16 bytes:', buffer.toString('hex'));
} catch (err) {
  console.log('Error reading file:', err.message);
}