const express = require('express');
const router = express.Router();
const { z } = require('zod');
const {
  getEntries,
  getEntryById,
  createEntry,
  updateEntry,
  deleteEntry,
  bulkDeleteEntries,
  setSetting,
  getCategoryById,
  getAccountById
} = require('../db/queries');
const { validate, createEntrySchema, updateEntrySchema, bulkDeleteEntriesSchema } = require('../middleware/validate');
// Local YYYY-MM-DD string, avoids the UTC-vs-local mismatch from Date parsing
const getTodayDateString = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// GET /api/entries
router.get('/', validate(z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    per_page: z.string().regex(/^\d+$/).optional(),
    type: z.enum(['income', 'expense']).optional(),
    category_id: z.string().regex(/^\d+$/).optional(),
    account_id: z.string().regex(/^\d+$/).optional(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    search: z.string().optional(),
    sort: z.enum(['date', 'amount', 'category', 'account']).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  }),
})), async (req, res, next) => {
  try {
    const filters = {};

    // Parse query parameters
    if (req.query.page) filters.page = parseInt(req.query.page);
    if (req.query.per_page) filters.per_page = parseInt(req.query.per_page);
    if (req.query.type) filters.type = req.query.type;
    if (req.query.category_id) filters.category_id = parseInt(req.query.category_id);
    if (req.query.account_id) filters.account_id = parseInt(req.query.account_id);
    if (req.query.from) filters.from = req.query.from;
    if (req.query.to) filters.to = req.query.to;
    if (req.query.search) filters.search = req.query.search;
    if (req.query.sort) filters.sort = req.query.sort;
    if (req.query.order) filters.order = req.query.order;
    if (filters.page) filters.offset = (filters.page - 1) * (filters.per_page || 10);
    if (filters.per_page) filters.limit = filters.per_page;

    const result = await getEntries(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/entries/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid entry ID',
        },
      });
    }

    const entry = await getEntryById(id);
    if (!entry) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Entry not found',
        },
      });
    }
    
    res.json({ entry });
  } catch (error) {
    next(error);
  }
});

// POST /api/entries
router.post('/', validate(createEntrySchema), async (req, res, next) => {
  try {
    // Validate that the category type matches the entry type
    const categoryId = req.body.category_id;
    const entryType = req.body.type;

    const category = await getCategoryById(categoryId);

    if (!category) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Category not found',
          fields: {
            category_id: 'Please select a valid category.'
          }
        },
      });
    }
    
    if (category.type !== entryType) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Category type must match entry type (${entryType})`,
          fields: {
            category_id: `Please select a ${entryType} category.`
          }
        },
      });
    }
    
    // Validate that the account exists
    const accountId = req.body.account_id;
    const account = await getAccountById(accountId);

    if (!account) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Account not found',
          fields: {
            account_id: 'Please select a valid account.'
          }
        },
      });
    }
    
    // Validate date is not in the future
    if (req.body.date > getTodayDateString()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Date cannot be in the future',
          fields: {
            date: 'Please select a date today or in the past.'
          }
        },
      });
    }
    
    const entry = await createEntry(req.body);

    // Update last used account setting
    await setSetting('last_used_account_id', String(accountId));

    res.status(201).json({ entry });
  } catch (error) {
    next(error);
  }
});

// PUT /api/entries/:id
router.put('/:id', validate(updateEntrySchema), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid entry ID',
        },
      });
    }

    const existingEntry = await getEntryById(id);
    if (!existingEntry) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Entry not found',
        },
      });
    }
    
    // If category_id is being updated, validate it matches the entry type
    if (req.body.category_id && req.body.category_id !== existingEntry.category_id) {
      const entryType = req.body.type || existingEntry.type;
      const category = await getCategoryById(req.body.category_id);

      if (!category) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Category not found',
            fields: {
              category_id: 'Please select a valid category.'
            }
          },
        });
      }
      
      if (category.type !== entryType) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Category type must match entry type (${entryType})`,
            fields: {
              category_id: `Please select a ${entryType} category.`
            }
          },
        });
      }
    }
    
    // If account_id is being updated, validate the account exists
    if (req.body.account_id && req.body.account_id !== existingEntry.account_id) {
      const account = await getAccountById(req.body.account_id);

      if (!account) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Account not found',
            fields: {
              account_id: 'Please select a valid account.'
            }
          },
        });
      }
    }
    
    // If date is being updated, validate it's not in the future
    if (req.body.date && req.body.date !== existingEntry.date) {
      if (req.body.date > getTodayDateString()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Date cannot be in the future',
            fields: {
              date: 'Please select a date today or in the past.'
            }
          },
        });
      }
    }
    
    const entry = await updateEntry(id, {
      type: req.body.type ?? existingEntry.type,
      amount: req.body.amount ?? existingEntry.amount,
      account_id: req.body.account_id ?? existingEntry.account_id,
      category_id: req.body.category_id ?? existingEntry.category_id,
      note: req.body.note !== undefined ? req.body.note : existingEntry.note,
      date: req.body.date ?? existingEntry.date,
    });
    res.json({ entry });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/entries/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid entry ID',
        },
      });
    }

    const entry = await getEntryById(id);
    if (!entry) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Entry not found',
        },
      });
    }

    const result = await deleteEntry(id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/entries/bulk-delete
router.post('/bulk-delete', validate(bulkDeleteEntriesSchema), async (req, res, next) => {
  try {
    const result = await bulkDeleteEntries(req.body.ids);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;