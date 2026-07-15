const express = require('express');
const router = express.Router();
const {
  getRecycleBin,
  restoreItem,
  purgeExpired
} = require('../db/queries');

// GET /api/recycle-bin - List all soft-deleted items
router.get('/', async (req, res, next) => {
  try {
    // Run purge first as a defense-in-depth measure
    await purgeExpired();
    
    // Get query parameters
    const { type, page, per_page } = req.query;
    
    // Build filters object
    const filters = {};
    if (type) filters.type = type;
    if (page) filters.page = parseInt(page);
    if (per_page) filters.per_page = parseInt(per_page);
    
    // Get recycle bin items
    const result = await getRecycleBin(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/recycle-bin/restore/:type/:id - Restore a soft-deleted item
router.post('/restore/:type/:id', async (req, res, next) => {
  try {
    const { type, id } = req.params;
    
    // Validate type parameter
    if (type !== 'accounts' && type !== 'entries') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid type. Must be "accounts" or "entries".'
        }
      });
    }
    
    // Validate id parameter
    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid ID. Must be a number.'
        }
      });
    }
    
    // Restore the item
    const result = await restoreItem(type, itemId);
    
    if (!result.restored) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: result.error || 'Item not found or already restored'
        }
      });
    }
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET+POST /api/recycle-bin/purge - Trigger permanent purge
//
// Fixed during the v2.3 build (found while wiring an equivalent cron
// endpoint for recurrences): Vercel Cron Jobs only ever invoke via HTTP
// GET, and can only send their own fixed `Authorization: Bearer
// $CRON_SECRET` header (if CRON_SECRET is set on the Vercel project) —
// they cannot send a custom X-API-Key header. This route was POST-only
// and X-API-Key-only, meaning its own `vercel.json` cron entry could
// never have actually authenticated successfully in production. Now
// accepts GET (for the real cron trigger) and POST (for manual/API
// runs), and either the existing X-API-Key/PURGE_API_KEY scheme or
// Vercel's native Authorization: Bearer CRON_SECRET scheme.
const purgeHandler = async (req, res, next) => {
  try {
    const apiKey = req.get('X-API-Key');
    const authHeader = req.get('Authorization');

    const apiKeyValid = apiKey && process.env.PURGE_API_KEY && apiKey === process.env.PURGE_API_KEY;
    const cronSecretValid = authHeader && process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!apiKeyValid && !cronSecretValid) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid credentials'
        }
      });
    }

    // Run purge
    const result = await purgeExpired();
    res.json({ purged: result });
  } catch (error) {
    next(error);
  }
};
router.get('/purge', purgeHandler);
router.post('/purge', purgeHandler);

module.exports = router;