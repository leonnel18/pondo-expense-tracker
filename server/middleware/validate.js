const { z } = require('zod');

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.errors,
      },
    });
  }
};

const createEntrySchema = z.object({
  body: z.object({
    type: z.enum(['income', 'expense']),
    amount: z.number().positive(),
    account_id: z.number().int().positive(),
    category_id: z.number().int().positive(),
    note: z.string().max(500).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
});

const updateEntrySchema = z.object({
  body: z.object({
    type: z.enum(['income', 'expense']).optional(),
    amount: z.number().positive().optional(),
    account_id: z.number().int().positive().optional(),
    category_id: z.number().int().positive().optional(),
    note: z.string().max(500).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

const createTransferSchema = z.object({
  body: z.object({
    from_account_id: z.number().int().positive(),
    to_account_id: z.number().int().positive(),
    amount: z.number().positive(),
    note: z.string().max(500).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
});

const bulkDeleteEntriesSchema = z.object({
  body: z.object({
    ids: z.array(z.number().int().positive()),
  }),
});

module.exports = {
  validate,
  createEntrySchema,
  updateEntrySchema,
  createTransferSchema,
  bulkDeleteEntriesSchema
};