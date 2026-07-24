const express = require('express');
const router = express.Router();
const { z } = require('zod');
const {
  getDashboardKPIs,
  getDashboardMoM,
  getExpenseBreakdown,
  getIncomeBreakdown,
  getDashboardAccounts,
  getRecentEntries,
  logAppEvent,
  getEngagementStats
} = require('../db/queries');
const { validate } = require('../middleware/validate');

const getDefaultDateRange = () => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const to = now.toISOString().split('T')[0];
  return { from, to };
};

router.get('/', validate(z.object({
  query: z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
})), async (req, res, next) => {
  try {
    let { from, to } = req.query;
    if (!from || !to) {
      const defaultRange = getDefaultDateRange();
      from = from || defaultRange.from;
      to = to || defaultRange.to;
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (fromDate > toDate) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'From date must be before or equal to to date' },
      });
    }
    const [kpi, mom, expense_breakdown, income_breakdown, accounts, recentEntries] = await Promise.all([
      getDashboardKPIs(from, to),
      getDashboardMoM(from, to),
      getExpenseBreakdown(from, to),
      getIncomeBreakdown(from, to),
      getDashboardAccounts(),
      getRecentEntries(from, to)
    ]);

    // Include total_balance in the response
    const { total_balance } = kpi;

    // Fire-and-forget event log (US-27) — never awaited, never blocks/fails this request
    logAppEvent('dashboard_viewed', { from, to });

    res.json({
      period: { from, to },
      kpi,
      mom,
      expense_breakdown,
      income_breakdown,
      accounts,
      recentEntries,
      total_balance
    });
  } catch (error) {
    next(error);
  }
});

router.get('/mom', validate(z.object({
  query: z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
})), async (req, res, next) => {
  try {
    let { from, to } = req.query;
    if (!from || !to) {
      const defaultRange = getDefaultDateRange();
      from = from || defaultRange.from;
      to = to || defaultRange.to;
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (fromDate > toDate) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'From date must be before or equal to to date' },
      });
    }
    const mom = await getDashboardMoM(from, to);
    res.json(mom);
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/engagement — US-40: lifetime transaction count + current
// daily logging streak. No date-range params (it's a lifetime/all-time stat,
// not period-scoped like the rest of this router).
router.get('/engagement', async (req, res, next) => {
  try {
    const stats = await getEngagementStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

module.exports = router;