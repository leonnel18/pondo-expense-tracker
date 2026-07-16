const express = require('express');
const router = express.Router();
const {
  getTags,
  createTag,
  deleteTag,
  getTagsReport,
} = require('../db/queries');
const { validate, createTagSchema } = require('../middleware/validate');

// GET /api/tags — list all tags (optional ?q= prefix filter for autocomplete)
router.get('/', async (req, res, next) => {
  try {
    const q = req.query.q || undefined;
    const result = await getTags(q);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/tags/report — tag-filtered spending report (design §B.3.3)
// MUST be registered before /:id, otherwise /report is captured by /:id
// with id='report' (same Express route-ordering reason as /calendar in entries.js)
router.get('/report', async (req, res, next) => {
  try {
    const from = req.query.from || undefined;
    const to = req.query.to || undefined;
    const tags = await getTagsReport(from, to);
    res.json({ from: from || null, to: to || null, tags });
  } catch (error) {
    next(error);
  }
});

// POST /api/tags — idempotent tag creation (design §B.3.1)
// Returns existing tag (200) if name_lower already exists, or new tag (201)
router.post('/', validate(createTagSchema), async (req, res, next) => {
  try {
    const { tag, created } = await createTag(req.body.name);
    res.status(created ? 201 : 200).json({ tag });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tags/:id — hard-delete a tag (cascades to entry_tags)
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await deleteTag(req.params.id);
    if (!result) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Tag not found' },
      });
    }
    res.json({ deleted: true, id: parseInt(req.params.id, 10) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;