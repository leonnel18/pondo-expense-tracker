#!/usr/bin/env node

// One-time data migration script from SQLite to Supabase PostgreSQL
const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// SQLite database connection
const sqliteDbPath = process.env.DB_PATH || 'data/pondo.db';
const sqliteDb = new Database(sqliteDbPath);

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Helper function to get all rows from SQLite
const sqliteAll = (sql, params = []) => {
  return sqliteDb.prepare(sql).all(params);
};

const sqliteGet = (sql, params = []) => {
  return sqliteDb.prepare(sql).get(params);
};

// Migration functions
async function migrateSettings() {
  console.log('Migrating settings...');
  const settings = await sqliteAll('SELECT key, value FROM settings');
  
  if (settings.length === 0) {
    console.log('No settings to migrate');
    return;
  }

  const { error } = await supabase
    .from('settings')
    .upsert(settings, { onConflict: 'key' });

  if (error) {
    throw new Error(`Failed to migrate settings: ${error.message}`);
  }

  console.log(`Migrated ${settings.length} settings`);
}

async function migrateCategories() {
  console.log('Migrating categories...');
  const categories = await sqliteAll(`
    SELECT id, name, type, color, icon, is_default, sort_order, created_at, updated_at 
    FROM categories
  `);

  if (categories.length === 0) {
    console.log('No categories to migrate');
    return;
  }

  // Convert boolean values
  const convertedCategories = categories.map(cat => ({
    ...cat,
    is_default: Boolean(cat.is_default),
    color: cat.color || null,
    icon: cat.icon || null
  }));

  const { error } = await supabase
    .from('categories')
    .upsert(convertedCategories, { onConflict: 'id' });

  if (error) {
    throw new Error(`Failed to migrate categories: ${error.message}`);
  }

  console.log(`Migrated ${categories.length} categories`);
}

async function migrateAccounts() {
  console.log('Migrating accounts...');
  const accounts = await sqliteAll(`
    SELECT id, name, type, description, emoji, created_at, updated_at 
    FROM accounts
  `);

  if (accounts.length === 0) {
    console.log('No accounts to migrate');
    return;
  }

  // Convert null values
  const convertedAccounts = accounts.map(acc => ({
    ...acc,
    description: acc.description || null,
    emoji: acc.emoji || null
  }));

  const { error } = await supabase
    .from('accounts')
    .upsert(convertedAccounts, { onConflict: 'id' });

  if (error) {
    throw new Error(`Failed to migrate accounts: ${error.message}`);
  }

  console.log(`Migrated ${accounts.length} accounts`);
}

async function migrateEntries() {
  console.log('Migrating entries...');
  const entries = await sqliteAll(`
    SELECT id, type, amount, account_id, category_id, note, date, created_at, updated_at 
    FROM entries
  `);

  if (entries.length === 0) {
    console.log('No entries to migrate');
    return;
  }

  // Convert null values
  const convertedEntries = entries.map(entry => ({
    ...entry,
    note: entry.note || null
  }));

  const { error } = await supabase
    .from('entries')
    .upsert(convertedEntries, { onConflict: 'id' });

  if (error) {
    throw new Error(`Failed to migrate entries: ${error.message}`);
  }

  console.log(`Migrated ${entries.length} entries`);
}

async function validateMigration() {
  console.log('Validating migration...');

  // Count records in SQLite
  const sqliteCounts = {
    settings: (await sqliteGet('SELECT COUNT(*) as count FROM settings')).count,
    categories: (await sqliteGet('SELECT COUNT(*) as count FROM categories')).count,
    accounts: (await sqliteGet('SELECT COUNT(*) as count FROM accounts')).count,
    entries: (await sqliteGet('SELECT COUNT(*) as count FROM entries')).count
  };

  // Count records in Supabase
  const { count: supabaseSettingsCount } = await supabase
    .from('settings')
    .select('*', { count: 'exact', head: true });

  const { count: supabaseCategoriesCount } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true });

  const { count: supabaseAccountsCount } = await supabase
    .from('accounts')
    .select('*', { count: 'exact', head: true });

  const { count: supabaseEntriesCount } = await supabase
    .from('entries')
    .select('*', { count: 'exact', head: true });

  const supabaseCounts = {
    settings: supabaseSettingsCount,
    categories: supabaseCategoriesCount,
    accounts: supabaseAccountsCount,
    entries: supabaseEntriesCount
  };

  console.log('Record counts:');
  console.log('SQLite:', sqliteCounts);
  console.log('Supabase:', supabaseCounts);

  // Validate counts match
  let isValid = true;
  for (const table in sqliteCounts) {
    if (sqliteCounts[table] !== supabaseCounts[table]) {
      console.error(`ERROR: ${table} count mismatch - SQLite: ${sqliteCounts[table]}, Supabase: ${supabaseCounts[table]}`);
      isValid = false;
    }
  }

  if (isValid) {
    console.log('Migration validation successful - all record counts match');
  } else {
    throw new Error('Migration validation failed - record counts do not match');
  }
}

async function main() {
  try {
    console.log('Starting data migration from SQLite to Supabase...');
    
    // Run migrations in order (FK dependency order)
    await migrateSettings();
    await migrateCategories();
    await migrateAccounts();
    await migrateEntries();
    
    // Validate migration
    await validateMigration();
    
    console.log('Data migration completed successfully!');
    
    // Close SQLite database connection
    sqliteDb.close();
  } catch (error) {
    console.error('Migration failed:', error.message);
    sqliteDb.close();
    process.exit(1);
  }
}

// Run migration if script is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  migrateSettings,
  migrateCategories,
  migrateAccounts,
  migrateEntries,
  validateMigration,
  main
};