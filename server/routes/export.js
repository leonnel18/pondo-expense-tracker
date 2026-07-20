const express = require('express');
const router = express.Router();
const { z } = require('zod');
const {
  getEntriesForExport,
  getAccountsForExport,
  logAppEvent
} = require('../db/queries');
const { validate } = require('../middleware/validate');

// Quote/escape a CSV field and neutralize formula-injection payloads (=, +, -, @ prefixes)
const csvField = (value) => {
  let v = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
};

const exportEntriesSchema = z.object({
  query: z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
});

// GET /api/export/entries
router.get('/entries', validate(exportEntriesSchema), async (req, res, next) => {
  try {
    const { from, to } = req.query;

    // Validate date range if provided
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);

      if (fromDate > toDate) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'From date must be before or equal to to date',
          },
        });
      }
    }

    const entries = await getEntriesForExport(from, to);
    
    // Set headers for CSV download
    const now = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="entries_export_${now}.csv"`);
    
    // Create CSV content
    let csv = 'ID,Type,Amount,Date,Category,Account,Note,Created At,Updated At,Pending,Tags\n';
    
    entries.forEach(entry => {
      csv += [entry.id, entry.type, entry.amount, entry.date, entry.category_name, entry.account_name, entry.note, entry.created_at, entry.updated_at, entry.pending ? 'Yes' : 'No', entry.tags || '']
        .map(csvField).join(',') + '\n';
    });

    // Fire-and-forget event log (US-27) — never awaited, never blocks/fails this request
    logAppEvent('export_downloaded', { export_type: 'entries' });

    res.send(csv);
  } catch (error) {
    next(error);
  }
});

// GET /api/export/accounts
router.get('/accounts', async (req, res, next) => {
  try {
    const accounts = await getAccountsForExport();
    
    // Set headers for CSV download
    const now = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="accounts_export_${now}.csv"`);
    
    // Create CSV content
    let csv = 'ID,Name,Type,Description\n';
    
    accounts.forEach(account => {
      csv += [account.id, account.name, account.type, account.description].map(csvField).join(',') + '\n';
    });

    // Fire-and-forget event log (US-27) — never awaited, never blocks/fails this request
    logAppEvent('export_downloaded', { export_type: 'accounts' });

    res.send(csv);
  } catch (error) {
    next(error);
  }
});

module.exports = router;