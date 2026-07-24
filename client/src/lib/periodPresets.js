/**
 * periodPresets.js — US-41 (v1.5): preset -> {from, to} date-range
 * computation, respecting a configurable period-start day (1-28) for the
 * three month-scoped presets. `this_year`/`all_time` are deliberately
 * unaffected by the period-start-day setting per the story's own spec.
 *
 * Worked example (period_start_day = 25, today = 2026-07-24):
 *   today's day-of-month (24) is BEFORE the start day (25), so "this
 *   month"'s cycle hasn't started yet this calendar month — the current
 *   cycle is still the one that started on 2026-06-25 and runs through
 *   2026-07-24 (today). => this_month = { from: '2026-06-25', to: '2026-07-24' }
 *
 * If today were 2026-07-26 instead (on/after the 25th), the current cycle
 * would be 2026-07-25 -> 2026-08-24, so this_month.to would be today
 * (2026-07-26), still mid-cycle.
 */
import { shiftMonth, clampToMonth, ymd, addDays } from './dateUtils';

export const PRESETS = ['this_month', 'last_month', 'last_3_months', 'this_year', 'all_time'];

const DEFAULT_PERIOD_START_DAY = 1;

// Normalizes whatever's in the setting (string, number, null, out-of-range)
// down to a valid 1-28 integer, defaulting to 1 (classic calendar month).
export function normalizePeriodStartDay(value) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1 || n > 28) return DEFAULT_PERIOD_START_DAY;
  return n;
}

// Returns the Date the current period (containing `referenceDate`) started on,
// for a given period-start day-of-month.
function periodStartContaining(day, referenceDate) {
  const refDay = referenceDate.getDate();
  let year = referenceDate.getFullYear();
  let monthIndex = referenceDate.getMonth();
  if (refDay < day) {
    ({ year, monthIndex } = shiftMonth(year, monthIndex, -1));
  }
  return clampToMonth(year, monthIndex, day);
}

// Given a date that is itself a period-start date, returns the period-start
// date `periodsBack` whole periods earlier.
function shiftPeriodStart(day, startDate, periodsBack) {
  const { year, monthIndex } = shiftMonth(startDate.getFullYear(), startDate.getMonth(), -periodsBack);
  return clampToMonth(year, monthIndex, day);
}

/**
 * Computes the {from, to} date-range string pair for a given preset.
 *
 * @param {string} preset - one of PRESETS
 * @param {number} periodStartDay - 1-28, already normalized
 * @param {Date} [today] - injectable for testing; defaults to now
 * @returns {{from: string, to: string}}
 */
export function computePresetRange(preset, periodStartDay, today = new Date()) {
  const day = normalizePeriodStartDay(periodStartDay);

  switch (preset) {
    case 'this_month': {
      const from = periodStartContaining(day, today);
      return { from: ymd(from), to: ymd(today) };
    }
    case 'last_month': {
      const curStart = periodStartContaining(day, today);
      const prevStart = shiftPeriodStart(day, curStart, 1);
      const prevEnd = addDays(curStart, -1);
      return { from: ymd(prevStart), to: ymd(prevEnd) };
    }
    case 'last_3_months': {
      const curStart = periodStartContaining(day, today);
      const from = shiftPeriodStart(day, curStart, 2);
      return { from: ymd(from), to: ymd(today) };
    }
    case 'this_year': {
      // Unaffected by period-start-day per US-41 spec — plain calendar year.
      const from = new Date(today.getFullYear(), 0, 1);
      return { from: ymd(from), to: ymd(today) };
    }
    case 'all_time':
    default:
      // Empty from/to == "no date bound", matching FilterPanel/getEntries'
      // existing convention for an unfiltered date range.
      return { from: '', to: '' };
  }
}
