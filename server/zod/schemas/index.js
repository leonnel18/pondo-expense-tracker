const { z } = require('zod');

// Entry schemas
const createEntrySchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  account_id: z.number().int().positive(),
  category_id: z.number().int().positive(),
  note: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

const updateEntrySchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  amount: z.number().positive().optional(),
  account_id: z.number().int().positive().optional(),
  category_id: z.number().int().positive().optional(),
  note: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

// Account schemas
const createAccountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['debit', 'credit', 'lent', 'borrowed', 'invest']),
  description: z.string().optional(),
  emoji: z.string().max(4).optional()
});

const updateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['debit', 'credit', 'lent', 'borrowed', 'invest']).optional(),
  description: z.string().optional(),
  emoji: z.string().max(4).optional()
});

// Category schemas
const createCategorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
  color: z.string().optional(),
  icon: z.string().max(4).optional()
});

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  icon: z.string().max(4).optional()
});

// Bulk delete schema
const bulkDeleteEntriesSchema = z.object({
  ids: z.array(z.number().int().positive())
});

module.exports = {
  createEntrySchema,
  updateEntrySchema,
  createAccountSchema,
  updateAccountSchema,
  createCategorySchema,
  updateCategorySchema,
  bulkDeleteEntriesSchema
};