const express = require('express');
const router = express.Router();
const {
  getBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetsWithCategories,
  getExpenseBreakdown,
} = require('../db/queries');
const { getCurrentCycle } = require('../lib/budget-cycle');
const { validate, createBudgetSchema, updateBudgetSchema } = require('../middleware/validate');

// ── CRUD routes (design §5.1) ──────────────────────────────────────────────

// GET /api/budgets — list all budgets (optional ?category_id filter)
router.get('/', async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.category_id) {
      const id = parseInt(req.query.category_id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'category_id must be a number' },
        });
      }
      filters.category_id = id;
    }
    const budgets = await getBudgets(filters);
    res.json(budgets);
  } catch (error) {
    next(error);
  }
});

// GET /api/budgets/:id
router.get('/:id', async (req, res, next) => {
  try {
    const budget = await getBudgetById(req.params.id);
    if (!budget) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Budget not found' },
      });
    }
    res.json(budget);
  } catch (error) {
    next(error);
  }
});

// POST /api/budgets
router.post('/', validate(createBudgetSchema), async (req, res, next) => {
  try {
    const budget = await createBudget(req.body);
    res.status(201).json(budget);
  } catch (error) {
    if (error.code === 'DUPLICATE_BUDGET') {
      return res.status(409).json({
        error: { code: 'DUPLICATE_BUDGET', message: error.message },
      });
    }
    next(error);
  }
});

// PUT /api/budgets/:id
router.put('/:id', validate(updateBudgetSchema), async (req, res, next) => {
  try {
    const existing = await getBudgetById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Budget not found' },
      });
    }

    // Merge update payload with existing row for cycle_end validation
    const merged = { ...existing, ...req.body };
    if (merged.cycle === 'custom' && !merged.cycle_end) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'cycle_end is required when cycle is "custom"',
        },
      });
    }

    const budget = await updateBudget(req.params.id, req.body);
    if (!budget) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Budget not found' },
      });
    }
    res.json(budget);
  } catch (error) {
    if (error.code === 'DUPLICATE_BUDGET') {
      return res.status(409).json({
        error: { code: 'DUPLICATE_BUDGET', message: error.message },
      });
    }
    next(error);
  }
});

// DELETE /api/budgets/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await deleteBudget(req.params.id);
    if (!result) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Budget not found' },
      });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ── Dashboard enrichment (design §5.2) ──────────────────────────────────────
// This route is mounted at /api/dashboard/budgets via a second mount in server.js.
// When mounted at /api/budgets, this route won't match (it's GET / on the
// dashboard-budgets mount path). The CRUD GET / above handles /api/budgets.

/**
 * GET /api/dashboard/budgets
 *
 * Returns all budgets enriched with:
 *   - current_cycle_start, current_cycle_end (from getCurrentCycle)
 *   - spend (from getExpenseBreakdown, matched by category_id)
 *   - percent, remaining, active flag
 */
function dashboardBudgetsHandler(req, res, next) {
  (async () => {
    // 1. Fetch all budgets with category join
    const budgets = await getBudgetsWithCategories();

    if (budgets.length === 0) {
      return [];
    }

    // 2. Compute cycle windows for each budget
    const enriched = budgets.map((b) => {
      const cycle = getCurrentCycle(b);
      return {
        ...b,
        current_cycle_start: cycle.start,
        current_cycle_end: cycle.end,
      };
    });

    // 3. Find the widest date range across all cycles
    const minStart = enriched
      .map((e) => e.current_cycle_start)
      .reduce((a, b) => (a < b ? a : b));
    const maxEnd = enriched
      .map((e) => e.current_cycle_end)
      .reduce((a, b) => (a > b ? a : b));

    // 4. One call to getExpenseBreakdown for the full range
    const breakdown = await getExpenseBreakdown(minStart, maxEnd);
    const spendByCategory = {};
    for (const item of breakdown) {
      spendByCategory[item.id] = item.total_amount;
    }

    // 5. Merge spend into each budget
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return enriched.map((b) => {
      const spend = spendByCategory[b.category_id] || 0;
      const percent = b.amount > 0 ? (spend / b.amount) * 100 : 0;
      const remaining = b.amount - spend;

      // Determine active flag (design §7)
      const cycleEndDate = new Date(b.current_cycle_end + 'T00:00:00');
      let active;
      if (b.reuse_next) {
        // Always active — cycle rolls forward mathematically
        active = true;
      } else {
        // Active only if the current cycle hasn't ended yet
        active = today <= cycleEndDate;
      }

      return {
        budget_id: b.id,
        category_id: b.category_id,
        category_name: b.category_name,
        category_color: b.category_color,
        category_icon: b.category_icon,
        amount: b.amount,
        cycle: b.cycle,
        cycle_start: b.cycle_start,
        cycle_end: b.cycle_end,
        reuse_next: b.reuse_next,
        current_cycle_start: b.current_cycle_start,
        current_cycle_end: b.current_cycle_end,
        spend,
        percent: Math.round(percent * 100) / 100, // 2 decimal places
        remaining: Math.round(remaining * 100) / 100,
        active,
      };
    });
  })().then((result) => res.json(result)).catch(next);
}

module.exports = router;
module.exports.dashboardBudgetsHandler = dashboardBudgetsHandler;
