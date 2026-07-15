/**
 * budget-cycle.js — Pure cycle-boundary calculation for budgets.
 *
 * Implements the algorithm from SAD §3.1.
 * No DB calls — pure JS, testable in isolation.
 *
 * Exports:
 *   getCurrentCycle(budgetRow) → { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
 */

const { shiftMonth, clampToMonth } = require('./date-utils');

/**
 * Format a Date as YYYY-MM-DD (local date, no time component).
 */
function fmt(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Compute the current cycle window for a budget row.
 *
 * @param {object} budget - A budget row with { cycle, cycle_start, cycle_end }
 * @returns {{ start: string, end: string }} Current cycle start/end as YYYY-MM-DD
 */
function getCurrentCycle(budget) {
  const now = new Date();
  // Normalize to date-only (strip time)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (budget.cycle === 'custom') {
    return {
      start: budget.cycle_start,
      end: budget.cycle_end,
    };
  }

  if (budget.cycle === 'weekly') {
    const cycleStart = new Date(budget.cycle_start + 'T00:00:00');
    // How many full 7-day periods have elapsed since cycle_start?
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const diffMs = today.getTime() - cycleStart.getTime();
    const periods = Math.floor(diffMs / msPerWeek);
    const start = new Date(cycleStart.getTime() + periods * msPerWeek);
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return { start: fmt(start), end: fmt(end) };
  }

  if (budget.cycle === 'monthly') {
    const cycleStart = new Date(budget.cycle_start + 'T00:00:00');
    const anchorDay = cycleStart.getDate(); // e.g., 15

    // Candidate: same day-of-month this month, clamped to the month's real length.
    // Note: the naive `new Date(year, month, anchorDay)` does NOT clamp when
    // anchorDay exceeds the month's day count — it silently overflows into the
    // next month instead (e.g. day 31 in April rolls over to May 1). That would
    // make `candidate > today` true for the entire month and push `start` a full
    // month too early. `clampToMonth` avoids the overflow at its source.
    const candidate = clampToMonth(today.getFullYear(), today.getMonth(), anchorDay);

    let start;
    if (candidate > today) {
      // We haven't reached it yet — current cycle started last month.
      // Uses shiftMonth (pure integer arithmetic) rather than addMonths on
      // `candidate` directly: candidate's day-of-month can be 29/30/31, and
      // shifting a Date object by -1 month with a day that doesn't exist in
      // the target month silently overflows back into candidate's own
      // month (e.g. Mar 31 shifted -1 month raw-Date-wise lands on Mar 3,
      // not Feb) — clampToMonth can't correct that after the fact because
      // by then the overflowed date's own .getMonth() already reports the
      // wrong (original) month. shiftMonth never constructs an
      // intermediate Date, so it can't inherit that overflow.
      const prev = shiftMonth(today.getFullYear(), today.getMonth(), -1);
      start = clampToMonth(prev.year, prev.monthIndex, anchorDay);
    } else {
      start = candidate;
    }

    // End = one day before the *next* cycle's start (mirrors how `start`
    // itself is derived — via shiftMonth + clampToMonth, not addMonths on
    // `start`, for the same overflow reason as above).
    const next = shiftMonth(start.getFullYear(), start.getMonth(), 1);
    const nextStart = clampToMonth(next.year, next.monthIndex, anchorDay);
    const end = new Date(nextStart.getTime() - 24 * 60 * 60 * 1000);
    return { start: fmt(start), end: fmt(end) };
  }

  // Should never reach here (cycle is CHECK-constrained)
  throw new Error(`Unknown cycle type: ${budget.cycle}`);
}

module.exports = { getCurrentCycle };
