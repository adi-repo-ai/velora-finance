// Money is always an integer count of minor units (cents / paise) plus an ISO-4217 code.

export type Currency = 'USD' | 'INR';
export type Country = 'US' | 'IN';

export const CURRENCY_BY_COUNTRY: Record<Country, Currency> = { US: 'USD', IN: 'INR' };
export const LOCALE_BY_CURRENCY: Record<Currency, string> = { USD: 'en-US', INR: 'en-IN' };

/** Both supported currencies have 2 decimal places. */
const MINOR = 100;

type FormatOptions = { cents?: boolean; sign?: boolean };

/** `formatMoney(2848512060, 'USD')` → `$28,485,120.60`; INR uses lakh/crore grouping. */
export function formatMoney(minor: number, currency: Currency, { cents = false, sign = false }: FormatOptions = {}) {
  return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
    signDisplay: sign ? 'exceptZero' : 'auto',
  }).format(minor / MINOR);
}

/** Short form for tiles and widgets: `$1.2M`, `₹14.2 L`, `₹2.1k`. */
export function formatCompact(minor: number, currency: Currency) {
  const major = minor / MINOR;
  const symbol = currency === 'INR' ? '₹' : '$';
  const abs = Math.abs(major);
  const neg = major < 0 ? '−' : '';
  const trim = (n: number) => (Math.round(n * 10) / 10).toString();
  if (currency === 'INR') {
    if (abs >= 1e7) return `${neg}${symbol}${trim(abs / 1e7)} Cr`;
    if (abs >= 1e5) return `${neg}${symbol}${trim(abs / 1e5)} L`;
  } else {
    if (abs >= 1e9) return `${neg}${symbol}${trim(abs / 1e9)}B`;
    if (abs >= 1e6) return `${neg}${symbol}${trim(abs / 1e6)}M`;
  }
  if (abs >= 1e3) return `${neg}${symbol}${trim(abs / 1e3)}k`;
  return `${neg}${symbol}${trim(abs)}`;
}

/** Splits a formatted amount into whole part and `.cents` for the serif hero style. */
export function splitCents(minor: number, currency: Currency) {
  const full = formatMoney(minor, currency, { cents: true });
  const i = full.lastIndexOf('.');
  return { whole: full.slice(0, i), cents: full.slice(i) };
}

/**
 * Parses user/CSV input into minor units without floating-point drift.
 * Accepts `1,234.50`, `₹1,23,456`, `-42`, `(42.10)`, `$5`. Returns null when not a number.
 */
export function parseToMinor(input: string): number | null {
  let s = input.trim();
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[\s,$₹]|USD|INR|Rs\.?/gi, '');
  if (s.startsWith('-') || s.startsWith('−')) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const minor = Number(m[1]) * MINOR + Number((m[2] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(minor)) return null;
  return negative ? -minor : minor;
}
