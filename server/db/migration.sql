-- Supabase PostgreSQL migration script for Pondo Household Expense Tracker

-- Enable pgcrypto extension for UUID functions (if needed)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop tables if they exist (for development only - remove in production)
-- DROP TABLE IF EXISTS entries;
-- DROP TABLE IF EXISTS accounts;
-- DROP TABLE IF EXISTS categories;
-- DROP TABLE IF EXISTS settings;

-- Categories table
CREATE TABLE categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT,
  icon TEXT,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accounts table
CREATE TABLE accounts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('debit', 'credit', 'lent', 'borrowed', 'invest')),
  description TEXT,
  emoji TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Entries table
CREATE TABLE entries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(10,2) NOT NULL,
  account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  note TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Indexes for better performance
CREATE INDEX idx_entries_date ON entries(date);
CREATE INDEX idx_entries_account_id ON entries(account_id);
CREATE INDEX idx_entries_category_id ON entries(category_id);
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_accounts_type ON accounts(type);

-- Default expense categories
INSERT INTO categories (name, type, color, icon, is_default, sort_order) VALUES
('Food & Dining', 'expense', '#FF6B6B', '🍽️', true, 1),
('Transportation', 'expense', '#4ECDC4', '🚗', true, 2),
('Shopping', 'expense', '#45B7D1', '🛍️', true, 3),
('Entertainment', 'expense', '#96CEB4', '🎮', true, 4),
('Utilities', 'expense', '#FFEAA7', '💡', true, 5),
('Healthcare', 'expense', '#DDA0DD', '🏥', true, 6),
('Travel', 'expense', '#98D8C8', '✈️', true, 7),
('Education', 'expense', '#F7DC6F', '📚', true, 8),
('Gifts & Donations', 'expense', '#BB8FCE', '🎁', true, 9),
('Other', 'expense', '#A6ACAF', '📦', true, 10);

-- Default income categories
INSERT INTO categories (name, type, color, icon, is_default, sort_order) VALUES
('Salary', 'income', '#58D68D', '💰', true, 1),
('Freelance', 'income', '#3498DB', '💻', true, 2),
('Investment', 'income', '#F4D03F', '📈', true, 3),
('Rental', 'income', '#E67E22', '🏠', true, 4),
('Business', 'income', '#AF7AC5', '🏢', true, 5),
('Other', 'income', '#A6ACAF', '📦', true, 6);