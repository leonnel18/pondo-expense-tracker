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

// POST /api/recycle-bin/purge - Trigger permanent purge
router.post('/purge', async (req, res, next) => {
  try {
    // Check for API key in header
    const apiKey = req.get('X-API-Key');
    const expectedApiKey = process.env.PURGE_API_KEY;
    
    // Validate API key
    if (!apiKey || !expectedApiKey || apiKey !== expectedApiKey) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid API key'
        }
      });
    }
    
    // Run purge
    const result = await purgeExpired();
    res.json({ purged: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;