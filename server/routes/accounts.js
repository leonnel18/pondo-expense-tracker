const express = require('express');
const router = express.Router();
const { z } = require('zod');
const {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  deleteEntriesByAccount
} = require('../db/queries');
const { validate } = require('../middleware/validate');

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

module.exports = router;