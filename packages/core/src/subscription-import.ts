import { normaliseDate } from './csv';
import { parseToMinor } from './money';
import type { Cadence } from './recurring';

export type SubscriptionRow = {
  name: string; amount: number; cadence: Cadence; nextDueOn: string | null;
  currency: 'USD' | 'INR' | null; category: string | null; website: string | null;
};
export type SubscriptionImport = { rows: SubscriptionRow[]; errors: { line: number; reason: string }[] };

const col = (header: string[], ...names: string[]) => header.findIndex((h) => names.some((n) => h.toLowerCase().trim().includes(n)));

const CADENCE: [RegExp, Cadence][] = [[/week/i, 'weekly'], [/year|annual|yr\b|^y$/i, 'yearly'], [/month|mo\b|^m$/i, 'monthly']];

/**
 * Reads a list of subscriptions (CSV or Excel rows). Needs a Name and a Price/Amount column; Billing cycle,
 * Next renewal, Currency, Category and Website are optional. Currency comes from a column, the price's
 * symbol (₹ / $), or is left null for the user to choose.
 */
export function importSubscriptionRows(all: string[][], { dayFirst }: { dayFirst: boolean }): SubscriptionImport {
  const start = all.slice(0, 20).findIndex((r) => col(r, 'name', 'service', 'subscription', 'app') >= 0 && col(r, 'price', 'amount', 'cost', 'fee') >= 0);
  const out: SubscriptionImport = { rows: [], errors: [] };
  if (start < 0) {
    out.errors.push({ line: 1, reason: 'Need a Name and a Price (or Amount) column' });
    return out;
  }
  const h = all[start]!;
  const name = col(h, 'name', 'service', 'subscription', 'app');
  const price = col(h, 'price', 'amount', 'cost', 'fee');
  const cycle = col(h, 'billing', 'cycle', 'frequency', 'cadence', 'period', 'interval', 'plan');
  const due = col(h, 'next', 'renew', 'due', 'date');
  const cur = col(h, 'currency');
  const cat = col(h, 'category', 'type');
  const site = col(h, 'website', 'url', 'domain', 'site');
  all.slice(start + 1).forEach((r, i) => {
    const line = start + i + 2;
    if (r.every((c) => !c?.trim())) return;
    const n = (r[name] ?? '').trim();
    const rawPrice = (r[price] ?? '').trim();
    const amount = parseToMinor(rawPrice);
    if (!n) return out.errors.push({ line, reason: 'Missing name' });
    if (amount === null || amount <= 0) return out.errors.push({ line, reason: `Bad price "${rawPrice}"` });
    const c = (cur >= 0 ? r[cur] ?? '' : '') + ' ' + rawPrice;
    const currency = /inr|₹|rs\.?\s|rupee/i.test(c) ? 'INR' : /usd|\$|dollar/i.test(c) ? 'USD' : null;
    const rawDue = due >= 0 ? (r[due] ?? '').trim() : '';
    const nextDueOn = rawDue ? normaliseDate(rawDue, dayFirst) : null;
    if (rawDue && !nextDueOn) return out.errors.push({ line, reason: `Bad date "${rawDue}"` });
    out.rows.push({
      name: n.slice(0, 60), amount, nextDueOn, currency,
      cadence: CADENCE.find(([re]) => re.test(cycle >= 0 ? r[cycle] ?? '' : ''))?.[1] ?? 'monthly',
      category: cat >= 0 ? (r[cat] ?? '').trim() || null : null,
      website: site >= 0 ? (r[site] ?? '').trim() || null : null,
    });
  });
  return out;
}
