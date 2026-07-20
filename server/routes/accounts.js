const express = require('express');
const router = express.Router();
const { z } = require('zod');
const {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  deleteEntriesByAccount,
  getAccountBalance,
  getBalanceAdjustmentCategory,
  createEntry,
  logAppEvent
} = require('../db/queries');
const { validate, reconcileAccountSchema } = require('../middleware/validate');
const { computeReconciliationEntry } = require('../lib/reconciliation');

// Local YYYY-MM-DD string, avoids the UTC-vs-local mismatch from Date parsing
const getTodayDateString = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// Get all accounts
router.get('/', async (req, res, next) => {
  try {
    const { sort, order } = req.query;
    const accounts = await getAccounts(sort, order);
    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

// Get account by ID
router.get('/:id', async (req, res, next) => {
  try {
    const account = await getAccountById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json(account);
  } catch (error) {
    next(error);
  }
});

// Create account
const createAccountSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    type: z.enum(['debit', 'credit', 'lent', 'borrowed', 'invest']),
    description: z.string().optional(),
    emoji: z.string().max(4).optional(),
  }),
});

router.post('/', validate(createAccountSchema), async (req, res, next) => {
  try {
    const { name, type, description, emoji } = req.body;
    const account = await createAccount({ name, type, description, emoji });
    res.status(201).json(account);
  } catch (error) {
    next(error);
  }
});

// Update account
const updateAccountSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    type: z.enum(['debit', 'credit', 'lent', 'borrowed', 'invest']).optional(),
    description: z.string().optional(),
    emoji: z.string().max(4).optional(),
  }),
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

router.put('/:id', validate(updateAccountSchema), async (req, res, next) => {
  try {
    const existingAccount = await getAccountById(req.params.id);
    if (!existingAccount) {
      return res.status(404).json({ error: 'Account not found' });
    }
    const account = await updateAccount(req.params.id, {
      name: req.body.name ?? existingAccount.name,
      type: req.body.type ?? existingAccount.type,
      description: req.body.description !== undefined ? req.body.description : existingAccount.description,
      emoji: req.body.emoji !== undefined ? req.body.emoji : existingAccount.emoji,
    });
    res.json(account);
  } catch (error) {
    next(error);
  }
});

// Delete account
router.delete('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const existingAccount = await getAccountById(id);
    if (!existingAccount) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Soft-delete the account
    const deletedAccount = await deleteAccount(id);
    
    // Soft-delete all entries belonging to this account
    const result = await deleteEntriesByAccount(id);
    
    // Return the soft-deleted account with entries count
    res.status(200).json({
      id: deletedAccount.id,
      deleted_at: deletedAccount.deleted_at,
      entries_soft_deleted: result.soft_deleted
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/accounts/:id/reconcile — US-03 balance reconciliation
router.post('/:id/reconcile', validate(reconcileAccountSchema), async (req, res, next) => {
  try {
    const id = req.params.id;
    const account = await getAccountById(id);
    if (!account) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Account not found' } });
    }

    const previousBalance = await getAccountBalance(id);
    const adjustment = computeReconciliationEntry(account.type, previousBalance, req.body.actual_balance);

    if (!adjustment) {
      return res.status(200).json({
        reconciled: true,
        adjustment_created: false,
        previous_balance: previousBalance,
        new_balance: previousBalance,
        delta: 0
      });
    }

    const category = await getBalanceAdjustmentCategory(adjustment.type);
    if (!category) {
      const err = new Error('Balance Adjustment category is missing. Contact support.');
      err.status = 500;
      err.code = 'MISSING_SYSTEM_CATEGORY';
      throw err;
    }

    const entry = await createEntry({
      type: adjustment.type,
      amount: adjustment.amount,
      account_id: Number(id),
      category_id: category.id,
      note: 'Balance reconciliation',
      date: getTodayDateString(),
    });

    const newBalance = await getAccountBalance(id);

    // Fire-and-forget event log (US-27) — never awaited, never blocks/fails this request
    logAppEvent('balance_reconciled', { account_type: account.type, delta: req.body.actual_balance - previousBalance });

    res.status(201).json({
      reconciled: true,
      adjustment_created: true,
      entry,
      previous_balance: previousBalance,
      new_balance: newBalance,
      delta: req.body.actual_balance - previousBalance,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;