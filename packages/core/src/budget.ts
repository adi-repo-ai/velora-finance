/** First day of the month as yyyy-mm-dd (the key budgets and summaries use). */
export function monthKey(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function daysLeftInMonth(d: Date = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate();
}

export type BudgetLine = { budgeted: number; spent: number };

/** Spent is a positive outflow total. Over-budget lines report a negative `remaining`. */
export function budgetStatus({ budgeted, spent }: BudgetLine) {
  const ratio = budgeted > 0 ? spent / budgeted : spent > 0 ? Infinity : 0;
  return {
    remaining: budgeted - spent,
    ratio,
    state: ratio > 1 ? 'over' : ratio >= 0.85 ? 'near' : 'ok',
  } as const;
}

/**
 * What can be spent today without breaking the month: remaining budget minus bills still
 * due this month, spread over the days left (today included). Never negative.
 */
export function safeToSpendToday(opts: { remainingBudget: number; billsDue: number; today?: Date }) {
  const days = daysLeftInMonth(opts.today) + 1;
  return Math.max(0, Math.floor((opts.remainingBudget - opts.billsDue) / days));
}
