/**
 * dateUtils.js — client-side port of server/lib/date-utils.js's month-shift
 * primitives (US-41, v1.5). Duplicated rather than shared across the
 * client/server boundary (separate bundles), but intentionally kept
 * byte-for-byte equivalent in behavior — see that file's comments for the
 * full rationale on why raw `Date.setMonth()` day-of-month arithmetic is
 * unsafe once the day-of-month can be 29-31 (it silently rolls into the
 * wrong month instead of clamping). periodPresets.js (US-41) is the reason
 * this file exists client-side — it must not reintroduce that overflow
 * class when computing "This Month"/"Last Month"/"Last 3 Months" ranges
 * for a custom period-start day.
 */

/**
 * Shift (year, monthIndex) by N months using plain integer arithmetic —
 * never constructs an intermediate Date object, so it can never trigger
 * JS's day-of-month overflow behavior.
 *
 * @returns {{ year: number, monthIndex: number }}
 */
export function shiftMonth(year, monthIndex, n) {
  const total = year * 12 + monthIndex + n;
  return { year: Math.floor(total / 12), monthIndex: ((total % 12) + 12) % 12 };
}

/**
 * Construct a date for (year, monthIndex, day), clamping `day` to the last
 * real day of that month instead of letting it overflow into the next month.
 */
export function clampToMonth(year, monthIndex, day) {
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(day, lastDayOfMonth));
}

/** Format a Date as YYYY-MM-DD (local time, no timezone conversion). */
export function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Add N days to a date — safe native Date arithmetic (setDate correctly
 * rolls over month/year boundaries; unlike setMonth, this is not the
 * buggy overflow class documented above). Returns a new Date, does not
 * mutate the input. */
export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
