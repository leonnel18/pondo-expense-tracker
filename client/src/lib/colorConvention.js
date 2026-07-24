/**
 * colorConvention.js — US-43 (v1.5): income/expense color-mapping helpers.
 *
 * Centralizes the literal Tailwind class strings for the "income/expense"
 * (or income-like/expense-like, e.g. net > 0) color convention, honoring the
 * `swap_income_expense_colors` setting (surfaced via ColorConventionContext).
 * Default (swapped = false): income/positive = green, expense/negative = red
 * — matching this app's existing hardcoded convention. When swapped = true,
 * that's flipped app-wide.
 *
 * Every function below returns a full, literal Tailwind class string (never
 * built via string concatenation) so Tailwind's static content scanner
 * always sees the complete class name in this file's raw source, regardless
 * of which branch a given render takes.
 */

// `isPositive` = true for income / net-positive-style values, false for
// expense / net-negative-style values.
export function flowTextClass(swapped, isPositive) {
  if (isPositive) return swapped ? 'text-red-600' : 'text-green-600';
  return swapped ? 'text-green-600' : 'text-red-600';
}

// Lighter shade used on the brand-colored BalanceHero card background.
export function flowTextClass300(swapped, isPositive) {
  if (isPositive) return swapped ? 'text-red-300' : 'text-green-300';
  return swapped ? 'text-green-300' : 'text-red-300';
}

// Icon-chip background (RecentEntries.jsx).
export function flowBgClass100(swapped, isPositive) {
  if (isPositive) return swapped ? 'bg-red-100' : 'bg-green-100';
  return swapped ? 'bg-green-100' : 'bg-red-100';
}

// Full "selected" badge classes for the Expense/Income type-toggle buttons
// (QuickAdd.jsx, AddEntry.jsx, AddEntryModal.jsx) — isExpense selects the
// expense-flavored branch (isPositive = false).
export function flowBadgeClass(swapped, isPositive) {
  if (isPositive) {
    return swapped
      ? 'bg-red-100 text-red-800 border border-red-200'
      : 'bg-green-100 text-green-800 border border-green-200';
  }
  return swapped
    ? 'bg-green-100 text-green-800 border border-green-200'
    : 'bg-red-100 text-red-800 border border-red-200';
}

// Day-net color for CalendarView.jsx — three-way (positive/negative/zero).
export function netColorClass(swapped, net) {
  if (net > 0) return flowTextClass(swapped, true);
  if (net < 0) return flowTextClass(swapped, false);
  return 'text-gray-400';
}
