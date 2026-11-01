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
