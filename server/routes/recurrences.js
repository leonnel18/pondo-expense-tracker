const express = require('express');
const router = express.Router();
const {
  getRecurrences,
  getRecurrenceById,
  createRecurrence,
  updateRecurrence,
  deleteRecurrence,
  archiveRecurrence,
  restoreRecurrence,
  getPendingConfirmationRecurrences,
  processRecurrences,
  confirmRecurrence,
  getAccountById,
  getCategoryById,
} = require('../db/queries');
const { validate, createRecurrenceSchema, updateRecurrenceSchema } = require('../middleware/validate');

// GET /api/recurrences — list (optional ?archived=true for the archived section)
router.get('/', async (req, res, next) => {
  try {
    const archived = req.query.archived === 'true' ? true : undefined;
    const recurrences = await getRecurrences({ archived });
    res.json(recurrences);
  } catch (error) {
    next(error);
  }
});

// GET /api/recurrences/due — pending-confirmation list (must come before /:id)
router.get('/due', async (req, res, next) => {
  try {
    const due = await getPendingConfirmationRecurrences();
    res.json(due);
  } catch (error) {
    next(error);
  }
});

// GET+POST /api/recurrences/process — cron-only, dual-gated.
// Must be registered before GET /:id (below), same reason /due is above
// it: Express matches route registration order, and /:id would otherwise
// capture "process" as an id, 404ing before this handler is ever reached.
// Found during independent review of this sprint's build — this endpoint
// existed with the correct dual GET/POST + dual-auth logic (see comment
// history in git blame) but was registered AFTER /:id, meaning the real
// Vercel Cron GET trigger had never actually been reachable in production.
//
// Two things fixed relative to server/routes/recycle-bin.js's /purge:
// 1. Vercel Cron Jobs ALWAYS invoke via HTTP GET (confirmed against
//    Vercel's own docs — https://vercel.com/docs/cron-jobs), never POST,
//    regardless of what the target route accepts. Both methods are
//    registered here.
// 2. Vercel Cron cannot send custom headers — it only ever sends its own
//    fixed `Authorization: Bearer $CRON_SECRET` (if configured) plus
//    identification headers. This endpoint accepts EITHER the existing
//    X-API-Key/PURGE_API_KEY scheme (manual/API-triggered runs) OR
//    Vercel's native Authorization: Bearer CRON_SECRET scheme (the real
//    cron trigger).
const processHandler = async (req, res, next) => {
  try {
    const apiKey = req.get('X-API-Key');
    const authHeader = req.get('Authorization');

    const apiKeyValid = apiKey && process.env.PURGE_API_KEY && apiKey === process.env.PURGE_API_KEY;
    const cronSecretValid = authHeader && process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!apiKeyValid && !cronSecretValid) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid credentials' } });
    }

    const result = await processRecurrences();
    res.json(result);
  } catch (error) {
    next(error);
  }
};
router.get('/process', processHandler);
router.post('/process', processHandler);

// GET /api/recurrences/:id
router.get('/:id', async (req, res, next) => {
  try {
    const recurrence = await getRecurrenceById(req.params.id);
    if (!recurrence) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Recurrence not found' } });
    }
    res.json(recurrence);
  } catch (error) {
    next(error);
  }
});

// POST /api/recurrences
router.post('/', validate(createRecurrenceSchema), async (req, res, next) => {
  try {
    const { account_id, category_id, type } = req.body;

    const account = await getAccountById(account_id);
    if (!account) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Account not found', fields: { account_id: 'Please select a valid account.' } },
      });
    }

    const category = await getCategoryById(category_id);
    if (!category) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Category not found', fields: { category_id: 'Please select a valid category.' } },
      });
    }
    if (category.type !== type) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: `Category type must match entry type (${type})`, fields: { category_id: `Please select a ${type} category.` } },
      });
    }

    const recurrence = await createRecurrence(req.body);
    res.status(201).json(recurrence);
  } catch (error) {
    next(error);
  }
});

// PUT /api/recurrences/:id
router.put('/:id', validate(updateRecurrenceSchema), async (req, res, next) => {
  try {
    const existing = await getRecurrenceById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Recurrence not found' } });
    }

    const merged = { ...existing, ...req.body };
    if (merged.mode === 'installment' && !merged.occurrences_total) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'occurrences_total is required when mode is "installment"' },
      });
    }

    if (req.body.category_id || req.body.type) {
      const category = await getCategoryById(merged.category_id);
      if (!category) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Category not found', fields: { category_id: 'Please select a valid category.' } },
        });
      }
      if (category.type !== merged.type) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: `Category type must match entry type (${merged.type})`, fields: { category_id: `Please select a ${merged.type} category.` } },
        });
      }
    }

    const recurrence = await updateRecurrence(req.params.id, req.body);
    res.json(recurrence);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/recurrences/:id — hard delete, blocked if entries reference it
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await deleteRecurrence(req.params.id);
    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Recurrence not found' } });
    }
    res.status(204).send();
  } catch (error) {
    if (error.code === 'HAS_ENTRIES') {
      return res.status(409).json({ error: { code: 'HAS_ENTRIES', message: error.message } });
    }
    next(error);
  }
});

// POST /api/recurrences/:id/archive
router.post('/:id/archive', async (req, res, next) => {
  try {
    const recurrence = await archiveRecurrence(req.params.id, {});
    if (!recurrence) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Recurrence not found' } });
    }
    res.json(recurrence);
  } catch (error) {
    next(error);
  }
});

// POST /api/recurrences/:id/restore
router.post('/:id/restore', async (req, res, next) => {
  try {
    const recurrence = await restoreRecurrence(req.params.id);
    if (!recurrence) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Recurrence not found' } });
    }
    res.json(recurrence);
  } catch (error) {
    if (error.code === 'INSTALLMENT_COMPLETE' || error.code === 'SUBSCRIPTION_ENDED') {
      return res.status(409).json({ error: { code: error.code, message: error.message } });
    }
    next(error);
  }
});

// POST /api/recurrences/:id/confirm — no body; posts the pending entry
router.post('/:id/confirm', async (req, res, next) => {
  try {
    const entry = await confirmRecurrence(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Recurrence not found' } });
    }
    res.status(201).json({ entry });
  } catch (error) {
    if (error.code === 'NOT_PENDING') {
      return res.status(409).json({ error: { code: 'NOT_PENDING', message: error.message } });
    }
    next(error);
  }
});

module.exports = router;
