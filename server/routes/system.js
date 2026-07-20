const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const {
  getSetting,
  setSetting,
  getAccounts,
  getCategories,
  createAccount,
  getEntryCount,
  getCategoryById,
  getAllSettings,
  createCategory
} = require('../db/queries');

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
    
    // Check if any users exist (for re-onboarding flow)
    const { count: userCount, error: userCountError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const hasUsers = userCount > 0;

    const accounts = await getAccounts();
    const hasAccounts = accounts.length > 0;

    const entryCount = await getEntryCount();
    const hasEntries = entryCount > 0;

    res.json({
      first_launch: !firstLaunchCompleted,
      has_users: hasUsers,
      has_accounts: hasAccounts,
      has_entries: hasEntries
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/settings
router.get('/settings', async (req, res, next) => {
  try {
    const allSettings = await getAllSettings();
    const result = {};
    
    // Filter to only include the specific settings we want
    const keysToInclude = ['last_used_account_id', 'first_launch_completed', 'calendar_view_tooltip_dismissed', 'privacy_mask_enabled'];
    keysToInclude.forEach(key => {
      if (allSettings[key] !== undefined) {
        result[key] = allSettings[key];
      }
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings
router.put('/settings', async (req, res, next) => {
  try {
    const { last_used_account_id, calendar_view_tooltip_dismissed, privacy_mask_enabled } = req.body;

    if (last_used_account_id !== undefined) {
      const normalizedAccountId = parseInt(last_used_account_id, 10);
      if (isNaN(normalizedAccountId)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'last_used_account_id must be a valid integer',
          },
        });
      }
      await setSetting('last_used_account_id', normalizedAccountId.toString());
    }

    if (calendar_view_tooltip_dismissed !== undefined) {
      await setSetting('calendar_view_tooltip_dismissed', calendar_view_tooltip_dismissed.toString());
    }

    if (privacy_mask_enabled !== undefined) {
      await setSetting('privacy_mask_enabled', privacy_mask_enabled.toString());
    }

    const allSettings = await getAllSettings();
    const result = {};

    // Filter to only include the specific settings we want
    const keysToInclude = ['last_used_account_id', 'first_launch_completed', 'calendar_view_tooltip_dismissed', 'privacy_mask_enabled'];
    keysToInclude.forEach(key => {
      if (allSettings[key] !== undefined) {
        result[key] = allSettings[key];
      }
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;