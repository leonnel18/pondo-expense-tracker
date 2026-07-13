const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const {
  getSetting,
  setSetting,
  getAccounts,
  getCategories,
  createAccount
} = require('../db/queries');
const { validate, setupSchema, setPassphraseSchema } = require('../middleware/validate');
const db = require('../db/schema');

// Promisified helpers for one-off raw queries in this file
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) { err ? reject(err) : resolve(this); });
});

// FR-12 / FR-13 default categories, seeded once on first launch
const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', type: 'expense', color: '#1F7A64', sort_order: 1 },
  { name: 'Transportation', type: 'expense', color: '#2A9A7D', sort_order: 2 },
  { name: 'Housing & Utilities', type: 'expense', color: '#45B095', sort_order: 3 },
  { name: 'Shopping', type: 'expense', color: '#6FC9B0', sort_order: 4 },
  { name: 'Entertainment', type: 'expense', color: '#E89C2A', sort_order: 5 },
  { name: 'Subscriptions', type: 'expense', color: '#F5B042', sort_order: 6 },
  { name: 'Health', type: 'expense', color: '#F9C55A', sort_order: 7 },
  { name: 'Education', type: 'expense', color: '#5B6FBF', sort_order: 8 },
  { name: 'Insurance', type: 'expense', color: '#8B5CF6', sort_order: 9 },
  { name: 'Other', type: 'expense', color: '#D14343', sort_order: 10 },
  { name: 'Salary', type: 'income', color: '#1B8E4E', sort_order: 1 },
  { name: 'Freelance', type: 'income', color: '#2A9A7D', sort_order: 2 },
  { name: 'Gift', type: 'income', color: '#45B095', sort_order: 3 },
  { name: 'Investment', type: 'income', color: '#F5B042', sort_order: 4 },
  { name: 'Refund', type: 'income', color: '#5B6FBF', sort_order: 5 },
  { name: 'Other Income', type: 'income', color: '#8B5CF6', sort_order: 6 },
];

// GET /api/system/status
router.get('/status', async (req, res, next) => {
  try {
    const firstLaunchCompleted = (await getSetting('first_launch_completed')) === '1';

    let hasAccounts = false;
    let hasEntries = false;

    if (firstLaunchCompleted) {
      const accounts = await getAccounts();
      hasAccounts = accounts.length > 0;

      const entryCount = await dbGet('SELECT COUNT(*) as count FROM entries');
      hasEntries = entryCount.count > 0;
    }

    res.json({
      first_launch: !firstLaunchCompleted,
      has_accounts: hasAccounts,
      has_entries: hasEntries
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/system/setup
router.post('/setup', validate(setupSchema), async (req, res, next) => {
  try {
    // Check if setup already completed
    const firstLaunchCompleted = (await getSetting('first_launch_completed')) === '1';
    if (firstLaunchCompleted) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Setup already completed',
        },
      });
    }

    // Set passphrase if provided
    if (req.body.passphrase) {
      const saltRounds = 12;
      const hash = bcrypt.hashSync(req.body.passphrase, saltRounds);
      await setSetting('passphrase_hash', hash);
    }

    // Create default "Cash" account if it doesn't exist
    let cashAccount = null;
    const existingCashAccount = await dbGet(
      "SELECT * FROM accounts WHERE name = 'Cash' AND type = 'debit'"
    );

    if (!existingCashAccount) {
      cashAccount = await createAccount({
        name: 'Cash',
        type: 'debit',
        description: 'Default cash account'
      });
    } else {
      cashAccount = existingCashAccount;
    }

    // Seed default categories if none exist yet
    const existingCount = await dbGet('SELECT COUNT(*) as count FROM categories');
    let categoriesCreated = 0;
    if (existingCount.count === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await dbRun(
          'INSERT INTO categories (name, type, color, is_default, sort_order) VALUES (?, ?, ?, 1, ?)',
          [cat.name, cat.type, cat.color, cat.sort_order]
        );
        categoriesCreated++;
      }
    }

    // Mark first launch as completed
    await setSetting('first_launch_completed', '1');

    res.json({
      first_launch_completed: true,
      cash_account: cashAccount,
      categories_created: categoriesCreated
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/system/set-passphrase
router.post('/set-passphrase', validate(setPassphraseSchema), async (req, res, next) => {
  try {
    const { current_passphrase, new_passphrase } = req.body;

    // Check if a passphrase is already set
    const passphraseHash = await getSetting('passphrase_hash');

    // If a passphrase is set, verify current passphrase
    if (passphraseHash) {
      if (!current_passphrase) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Current passphrase is required',
          },
        });
      }

      const isValid = bcrypt.compareSync(current_passphrase, passphraseHash);
      if (!isValid) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Current passphrase is incorrect',
          },
        });
      }
    }

    // Hash and set new passphrase
    const saltRounds = 12;
    const hash = bcrypt.hashSync(new_passphrase, saltRounds);
    await setSetting('passphrase_hash', hash);

    res.json({ updated: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/settings
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await dbAll(`
      SELECT key, value
      FROM settings
      WHERE key IN ('last_used_account_id', 'first_launch_completed')
    `);

    const result = {};
    settings.forEach(setting => {
      result[setting.key] = setting.value;
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings
router.put('/settings', async (req, res, next) => {
  try {
    const { last_used_account_id } = req.body;

    if (last_used_account_id !== undefined) {
      await setSetting('last_used_account_id', last_used_account_id.toString());
    }

    const settings = await dbAll(`
      SELECT key, value
      FROM settings
      WHERE key IN ('last_used_account_id', 'first_launch_completed')
    `);

    const result = {};
    settings.forEach(setting => {
      result[setting.key] = setting.value;
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;