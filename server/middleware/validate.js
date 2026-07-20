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
    tag_ids: z.array(z.number().int().positive()).optional(),
    pending: z.boolean().optional(),  // US-04: optional pending flag at creation
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
    tag_ids: z.array(z.number().int().positive()).optional(),
    pending: z.boolean().optional(),  // US-04: optional pending flag at update
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

// Calendar query schema (US-08, design §A.3.1)
const calendarQuerySchema = z.object({
  query: z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM'),
  }),
});

// Tag creation schema (US-14, design §B.3.1)
const createTagSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).trim(),
  }),
});

// Budget schemas (US-17, design §5.1)
const createBudgetSchema = z.object({
  body: z.object({
    category_id: z.number().int().positive(),
    amount: z.number().positive(),
    cycle: z.enum(['weekly', 'monthly', 'custom']),
    cycle_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    cycle_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    reuse_next: z.boolean().optional().default(false),
  }).superRefine((data, ctx) => {
    if (data.cycle === 'custom' && !data.cycle_end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'cycle_end is required when cycle is "custom"',
        path: ['cycle_end'],
      });
    }
    if (data.cycle !== 'custom' && data.cycle_end !== undefined && data.cycle_end !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'cycle_end must not be set unless cycle is "custom"',
        path: ['cycle_end'],
      });
    }
  }),
});

const updateBudgetSchema = z.object({
  body: z.object({
    category_id: z.number().int().positive().optional(),
    amount: z.number().positive().optional(),
    cycle: z.enum(['weekly', 'monthly', 'custom']).optional(),
    cycle_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    cycle_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    reuse_next: z.boolean().optional(),
  }).superRefine((data, ctx) => {
    if (data.cycle && data.cycle !== 'custom' && data.cycle_end !== undefined && data.cycle_end !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'cycle_end must not be set unless cycle is "custom"',
        path: ['cycle_end'],
      });
    }
  }),
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

// Recurrence schemas (US-16, design §5)
const createRecurrenceSchema = z.object({
  body: z.object({
    account_id: z.number().int().positive(),
    category_id: z.number().int().positive(),
    type: z.enum(['income', 'expense']),
    amount: z.number().positive(),
    note: z.string().max(500).optional(),
    mode: z.enum(['repeat', 'installment', 'subscription']),
    cycle: z.enum(['weekly', 'monthly']),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    occurrences_total: z.number().int().positive().optional(),
    auto_post: z.boolean().optional().default(true),
  }).superRefine((data, ctx) => {
    if (data.mode === 'installment' && !data.occurrences_total) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'occurrences_total is required when mode is "installment"',
        path: ['occurrences_total'],
      });
    }
    if (data.mode !== 'installment' && data.occurrences_total !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'occurrences_total must not be set unless mode is "installment"',
        path: ['occurrences_total'],
      });
    }
    if (data.mode !== 'subscription' && data.end_date !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'end_date must not be set directly unless mode is "subscription" (installment end_date is derived)',
        path: ['end_date'],
      });
    }
  }),
});

const updateRecurrenceSchema = z.object({
  body: z.object({
    account_id: z.number().int().positive().optional(),
    category_id: z.number().int().positive().optional(),
    type: z.enum(['income', 'expense']).optional(),
    amount: z.number().positive().optional(),
    note: z.string().max(500).optional(),
    mode: z.enum(['repeat', 'installment', 'subscription']).optional(),
    cycle: z.enum(['weekly', 'monthly']).optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    occurrences_total: z.number().int().positive().optional(),
    auto_post: z.boolean().optional(),
  }).superRefine((data, ctx) => {
    if (data.mode === 'installment' && data.occurrences_total === undefined) {
      // Allowed: an existing installment being edited without changing occurrences_total.
      // The route merges with the existing row before persisting (same pattern as budgets' PUT).
    }
    if (data.mode && data.mode !== 'installment' && data.occurrences_total !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'occurrences_total must not be set unless mode is "installment"',
        path: ['occurrences_total'],
      });
    }
    if (data.mode && data.mode !== 'subscription' && data.end_date !== undefined && data.end_date !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'end_date must not be set directly unless mode is "subscription"',
        path: ['end_date'],
      });
    }
  }),
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

// Reconciliation schema (US-03, v1.2)
const reconcileAccountSchema = z.object({
  body: z.object({
    actual_balance: z.number(), // signed — negative is valid for credit/lent "amount owed" accounts
  }),
  params: z.object({ id: z.string().regex(/^\d+$/) }),
});

module.exports = {
  validate,
  createEntrySchema,
  updateEntrySchema,
  createTransferSchema,
  bulkDeleteEntriesSchema,
  calendarQuerySchema,
  createTagSchema,
  createBudgetSchema,
  updateBudgetSchema,
  createRecurrenceSchema,
  updateRecurrenceSchema,
  reconcileAccountSchema,
};