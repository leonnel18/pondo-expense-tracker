/**
 * date-utils.js — Shared month-arithmetic primitives.
 *
 * Extracted from budget-cycle.js (v2.2) so recurrence-cycle.js (v2.3) can
 * reuse the same day-of-month clamping fix without re-deriving it.
 */

/**
 * Add N months to a date, clamping the day-of-month if needed.
 * Standard JS setMonth behavior: if anchor day 31 in April, clamps to April 30.
 *
 * CAUTION: this still uses the native Date/setMonth machinery, which means
 * it inherits JS's day-overflow behavior when `date`'s day-of-month doesn't
 * exist in the target month (e.g. Mar 31 shifted -1 month tries to build
 * "Feb 31", which doesn't clamp — it rolls forward to Mar 3, silently
 * landing back in the *original* month). Safe to use only when `date`'s
 * day-of-month is guaranteed small enough to exist in every month it might
 * shift into (i.e. <= 28). For anchor-day-sensitive month shifting (where
 * the day can be 29/30/31), use `shiftMonth` + `clampToMonth` instead — see
 * the note on shiftMonth below for why this function was insufficient on
 * its own (found during the v2.3 recurrence-cycle build, and retroactively
 * fixed in budget-cycle.js's two call sites that had the same exposure).
 */
function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

/**
 * Shift (year, monthIndex) by N months using plain integer arithmetic —
 * never constructs an intermediate Date object, so it can never trigger
 * JS's day-of-month overflow behavior. Use this (paired with
 * `clampToMonth`) instead of `addMonths` whenever the day-of-month being
 * carried across the shift might be 29, 30, or 31.
 *
 * @returns {{ year: number, monthIndex: number }}
 */
function shiftMonth(year, monthIndex, n) {
  const total = year * 12 + monthIndex + n;
  return { year: Math.floor(total / 12), monthIndex: ((total % 12) + 12) % 12 };
}

/**
 * Construct a date for (year, monthIndex, day), clamping `day` to the last
 * real day of that month instead of letting it overflow into the next month
 * (the native `new Date(year, monthIndex, day)` constructor overflows, it
 * does not clamp).
 */
function clampToMonth(year, monthIndex, day) {
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(day, lastDayOfMonth));
}

module.exports = { addMonths, shiftMonth, clampToMonth };
