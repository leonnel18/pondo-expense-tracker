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
  getSubcategoryCount,
  getFallbackCategory,
  reassignCategoryEntries
} = require('../db/queries');
const { validate } = require('../middleware/validate');

// Create schemas for category validation
// NOTE (US-13): the approved design doc (docs/v1.4-categorization-depth/
// 01-subcategory-design.md §2/§8) says these schemas live in
// server/middleware/validate.js, but in this codebase they've always
// lived here, inline in the route file — validate.js only holds
// entry/transfer/budget/recurrence/reconciliation schemas. Flagging this
// as a design-doc inaccuracy (file location only, not a functional
// deviation) and adding parent_category_id here, where the schemas
// actually live and are actually used.
const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1),
    type: z.enum(['income', 'expense']),
    color: z.string().optional(),
    icon: z.string().max(4).optional(),
    parent_category_id: z.number().int().positive().optional(),
  }),
});

const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    color: z.string().optional(),
    icon: z.string().max(4).optional(),
    parent_category_id: z.number().int().positive().nullable().optional(),
  }),
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

// Get all categories
router.get('/', async (req, res, next) => {
  try {
    const { type } = req.query;
    const categories = await getCategories(type);
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// Get category by ID
router.get('/:id', async (req, res, next) => {
  try {
    const category = await getCategoryById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    next(error);
  }
});

// Create category
router.post('/', validate(createCategorySchema), async (req, res, next) => {
  try {
    const { name, type, color, icon, parent_category_id } = req.body;
    const category = await createCategory({ name, type, color, icon, parent_category_id });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

// Update category
router.put('/:id', validate(updateCategorySchema), async (req, res, next) => {
  try {
    const existingCategory = await getCategoryById(req.params.id);
    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }
    const category = await updateCategory(req.params.id, {
      name: req.body.name ?? existingCategory.name,
      color: req.body.color !== undefined ? req.body.color : existingCategory.color,
      icon: req.body.icon !== undefined ? req.body.icon : existingCategory.icon,
      // US-13: undefined = leave unchanged, null = promote to top-level,
      // positive int = attempt to (re)parent — resolved/validated in updateCategory.
      parent_category_id: req.body.parent_category_id,
    });
    res.json(category);
  } catch (error) {
    next(error);
  }
});

// Delete category
router.delete('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const existingCategory = await getCategoryById(id);
    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // US-13: a category with existing subcategories cannot be deleted until
    // those subcategories are reassigned/deleted first — checked before the
    // existing is_default / entry-reassignment logic (design §2, DELETE table).
    const subcategoryCount = await getSubcategoryCount(id);
    if (subcategoryCount > 0) {
      return res.status(409).json({
        error: {
          code: 'HAS_SUBCATEGORIES',
          message: `This category has ${subcategoryCount} subcategor${subcategoryCount === 1 ? 'y' : 'ies'}. Delete or reassign them first.`,
        },
      });
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
      // US-13: deleting a subcategory rolls its entries up into its own
      // parent, not the type's global fallback (design §2, DELETE table).
      // Deleting a top-level category is guaranteed zero children by the
      // HAS_SUBCATEGORIES check above, so the fallback path is unchanged.
      let reassignTargetId;
      if (existingCategory.parent_category_id) {
        reassignTargetId = existingCategory.parent_category_id;
      } else {
        const fallback = await getFallbackCategory(existingCategory.type);
        if (!fallback) {
          return res.status(409).json({
            error: {
              code: 'HAS_ENTRIES',
              message: `This category has ${entryCount} entr${entryCount === 1 ? 'y' : 'ies'} and no "Other" category exists to reassign them to.`,
            },
          });
        }
        reassignTargetId = fallback.id;
      }
      await reassignCategoryEntries(id, reassignTargetId);
    }

    await deleteCategory(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;