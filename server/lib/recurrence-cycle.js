/**
 * recurrence-cycle.js — Pure due-date advancement for recurrences.
 *
 * Implements the algorithm from docs/v2.3-recurring-transactions/01-recurring-design.md §3.
 * No DB calls — pure JS, testable in isolation.
 *
 * Exports:
 *   computeNextDueDate(recurrence) → Date (JS Date object, caller formats as needed)
 */

const { clampToMonth, shiftMonth } = require('./date-utils');

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
 * Given a recurrence's cycle and its current next_due_date, compute the
 * following due date as a 'YYYY-MM-DD' string.
 *
 * @param {object} recurrence - { cycle, start_date, next_due_date }
 * @returns {string} Next due date as YYYY-MM-DD
 */
function computeNextDueDate(recurrence) {
  const current = new Date(recurrence.next_due_date + 'T00:00:00');

  if (recurrence.cycle === 'weekly') {
    return fmt(new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000));
  }

  if (recurrence.cycle === 'monthly') {
    // Anchor day comes from start_date, NOT from the current due date —
    // otherwise a clamped Feb 28 due date would permanently "downgrade"
    // a day-31 recurrence to the 28th every month after the first clamp.
    // The anchor must stay fixed at the originally chosen day.
    //
    // Uses shiftMonth (pure integer year/month arithmetic) rather than
    // addMonths on `current` directly: `current`'s day-of-month can be
    // 29/30/31, and shifting a Date object by +1 month with a day that
    // doesn't exist in the target month silently overflows further
    // forward (e.g. Mar 31 shifted +1 month raw-Date-wise lands on May 1,
    // not April) — clampToMonth can't correct that after the fact because
    // by then the overflowed date's own .getMonth()/.getFullYear() already
    // report the wrong month. This exact bug was found and fixed the same
    // way in budget-cycle.js's getCurrentCycle() during this build.
    const anchorDay = new Date(recurrence.start_date + 'T00:00:00').getDate();
    const next = shiftMonth(current.getFullYear(), current.getMonth(), 1);
    return fmt(clampToMonth(next.year, next.monthIndex, anchorDay));
  }

  throw new Error(`Unknown cycle type: ${recurrence.cycle}`);
}

/**
 * Compute the derived end_date for an installment recurrence:
 * start_date + (occurrences_total - 1) cycles.
 *
 * @param {object} recurrence - { cycle, start_date, occurrences_total }
 * @returns {string} Derived end date as YYYY-MM-DD
 */
function computeInstallmentEndDate(recurrence) {
  const { cycle, start_date, occurrences_total } = recurrence;
  const stepsRemaining = occurrences_total - 1;

  if (stepsRemaining === 0) {
    return start_date;
  }

  if (cycle === 'weekly') {
    const start = new Date(start_date + 'T00:00:00');
    return fmt(new Date(start.getTime() + stepsRemaining * 7 * 24 * 60 * 60 * 1000));
  }

  if (cycle === 'monthly') {
    const start = new Date(start_date + 'T00:00:00');
    const anchorDay = start.getDate();
    // Same shiftMonth reasoning as computeNextDueDate above — stepsRemaining
    // can be many months out, so this is even more exposed to the
    // addMonths-overflow bug than a single +1 shift would be.
    const target = shiftMonth(start.getFullYear(), start.getMonth(), stepsRemaining);
    return fmt(clampToMonth(target.year, target.monthIndex, anchorDay));
  }

  throw new Error(`Unknown cycle type: ${cycle}`);
}

module.exports = { computeNextDueDate, computeInstallmentEndDate };
