const express = require('express');
const router = express.Router();
const { z } = require('zod');
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryEntryCount,
  getFallbackCategory,
  reassignCategoryEntries
} = require('../db/queries');
const { validate } = require('../middleware/validate');

// Create schemas for category validation
const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1),
    type: z.enum(['income', 'expense']),
    color: z.string().optional(),
    icon: z.string().max(4).optional(),
  }),
});

const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    color: z.string().optional(),
    icon: z.string().max(4).optional(),
  }),
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

// Get all categories
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const categories = await getCategories(type);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get category by ID
router.get('/:id', async (req, res) => {
  try {
    const category = await getCategoryById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create category
router.post('/', validate(createCategorySchema), async (req, res) => {
  try {
    const { name, type, color, icon } = req.body;
    const category = await createCategory({ name, type, color, icon });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update category
router.put('/:id', validate(updateCategorySchema), async (req, res) => {
  try {
    const existingCategory = await getCategoryById(req.params.id);
    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }
    const category = await updateCategory(req.params.id, {
      name: req.body.name ?? existingCategory.name,
      color: req.body.color !== undefined ? req.body.color : existingCategory.color,
      icon: req.body.icon !== undefined ? req.body.icon : existingCategory.icon,
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const existingCategory = await getCategoryById(id);
    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (existingCategory.is_default) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Default categories cannot be deleted.',
        },
      });
    }

    const entryCount = await getCategoryEntryCount(id);
    if (entryCount > 0) {
      const fallback = await getFallbackCategory(existingCategory.type);
      if (!fallback) {
        return res.status(409).json({
          error: {
            code: 'HAS_ENTRIES',
            message: `This category has ${entryCount} entr${entryCount === 1 ? 'y' : 'ies'} and no "Other" category exists to reassign them to.`,
          },
        });
      }
      await reassignCategoryEntries(id, fallback.id);
    }

    await deleteCategory(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;