export type Cadence = 'weekly' | 'monthly' | 'yearly';

/** Average cost per month in minor units (weekly × 52 ÷ 12, yearly ÷ 12), rounded. */
export function monthlyCost(amount: number, cadence: Cadence) {
  return Math.round(cadence === 'weekly' ? (amount * 52) / 12 : cadence === 'yearly' ? amount / 12 : amount);
}

/** `https://www.Netflix.com/in/` → `netflix.com`; null when it isn't a plausible domain. */
export function domainFromInput(input: string): string | null {
  const host = input.trim().toLowerCase().replace(/^[a-z]+:\/\//, '').split(/[/?#]/)[0]!.replace(/^www\./, '').replace(/:\d+$/, '');
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : null;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Dates (yyyy-mm-dd) a recurring item falls on within `month` (yyyy-mm), starting from its next due date.
 * Monthly items on the 29th–31st land on the month's last day when it is shorter.
 */
export function occurrencesInMonth(nextDueOn: string, cadence: Cadence, month: string): string[] {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const first = `${month}-01`;
  const last = iso(new Date(y, m, 0));
  if (nextDueOn > last) return [];
  const start = new Date(`${nextDueOn}T00:00:00`);
  if (cadence === 'weekly') {
    const out: string[] = [];
    const d = new Date(start);
    while (iso(d) < first) d.setDate(d.getDate() + 7);
    for (; iso(d) <= last; d.setDate(d.getDate() + 7)) out.push(iso(d));
    return out;
  }
  if (cadence === 'yearly' && start.getMonth() !== m - 1) return [];
  if (cadence === 'yearly' && start.getFullYear() > y) return [];
  const day = Math.min(start.getDate(), new Date(y, m, 0).getDate());
  return [iso(new Date(y, m - 1, day))];
}
