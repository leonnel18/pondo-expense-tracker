/**
 * reconciliation.js — Pure balance-reconciliation logic for US-03 (v1.2).
 *
 * No DB calls — pure JS, testable in isolation. Matches the existing project
 * convention of pulling pure date/cycle math out of the route layer
 * (recurrence-cycle.js, budget-cycle.js both exist for exactly this reason).
 *
 * The existing balance formula (getAccountBalance() in queries.js) branches
 * on account.type:
 *   debit / invest / borrowed:  balance = totalIncome - totalExpense
 *   credit / lent:               balance = totalExpense - totalIncome
 *
 * computeReconciliationEntry picks the entry type (income vs expense) based
 * on which direction increases *that specific account type's* balance, not
 * naively "positive delta = income".
 *
 * Exports:
 *   computeReconciliationEntry(accountType, currentBalance, actualBalance) →
 *     { type, amount } | null
 */

const INCOME_INCREASES_BALANCE = new Set(['debit', 'invest', 'borrowed']);

const computeReconciliationEntry = (accountType, currentBalance, actualBalance) => {
  const delta = actualBalance - currentBalance; // signed, in "balance" terms
  if (delta === 0) return null;

  const incomeIncreases = INCOME_INCREASES_BALANCE.has(accountType);

  if (incomeIncreases) {
    return delta > 0
      ? { type: 'income', amount: delta }
      : { type: 'expense', amount: Math.abs(delta) };
  }
  // credit, lent — expense increases balance
  return delta > 0
    ? { type: 'expense', amount: delta }
    : { type: 'income', amount: Math.abs(delta) };
};

module.exports = { computeReconciliationEntry };