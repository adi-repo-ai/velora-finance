"use client";

import { budgetStatus, daysLeftInMonth, monthKey, safeToSpendToday } from "@velora/core";
import { useBills, useBudget, useCurrency } from "@velora/data";

/** Budget left this month minus manual bills still due, per remaining day (see core safeToSpendToday). */
export function useSafeToSpend() {
  const currency = useCurrency();
  const { data: lines = [] } = useBudget(monthKey());
  const { data: bills = [] } = useBills();
  const remaining = lines.reduce((s, l) => s + Math.max(budgetStatus(l).remaining, 0), 0);
  const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString("en-CA");
  const billsDue = bills.filter((b) => b.currency === currency && b.next_due_on <= end && !b.autopay).reduce((s, b) => s + b.amount, 0);
  return { safe: safeToSpendToday({ remainingBudget: remaining, billsDue }), hasBudget: lines.length > 0, daysLeft: daysLeftInMonth() + 1, currency };
}
