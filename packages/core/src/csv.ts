import { parseToMinor } from './money';

/** Guesses the separator from the first lines: comma, semicolon (European exports) or tab. */
export function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 10).join('\n');
  const count = (d: string) => sample.split(d).length;
  return [',', ';', '\t'].reduce((best, d) => (count(d) > count(best) ? d : best), ',');
}

/** RFC-4180-ish CSV parser: quoted fields, escaped quotes, CRLF, any single-character separator. */
export function parseCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
  text = text.replace(/^\uFEFF/, ''); // Excel's UTF-8 byte-order mark
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

export type ImportedRow = { postedOn: string; description: string; amount: number; externalId: string };
export type ImportResult = { rows: ImportedRow[]; errors: { line: number; reason: string }[] };

const find = (header: string[], ...names: string[]) =>
  header.findIndex((h) => names.some((n) => h.toLowerCase().includes(n)));

/** Normalises dd/mm/yyyy (India), mm/dd/yyyy (US) and ISO dates to yyyy-mm-dd. */
export function normaliseDate(raw: string, dayFirst: boolean): string | null {
  const s = raw.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s);
  if (!m) return null;
  const [a, b, y] = [Number(m[1]), Number(m[2]), m[3]!.length === 2 ? 2000 + Number(m[3]) : Number(m[3])];
  const [d, mo] = dayFirst ? [a, b] : [b, a];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Stable id so re-importing the same statement never duplicates rows. */
function hashRow(...parts: string[]) {
  let h = 2166136261; // FNV-1a
  for (const ch of parts.join('|')) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 16777619);
  }
  return `csv_${(h >>> 0).toString(36)}`;
}

export type Currency3 = 'USD' | 'INR';
export type StatementImport = ImportResult & { currency: Currency3 | null };

const isHeader = (row: string[]) =>
  find(row, 'date') >= 0 && (find(row, 'amount') >= 0 || find(row, 'debit', 'withdrawal') >= 0 || find(row, 'credit', 'deposit') >= 0);

/** INR or USD from symbols and codes in the file (₹, Rs, INR vs $, USD), or null when unclear. */
export function detectCurrency(rows: string[][]): Currency3 | null {
  const text = rows.slice(0, 200).flat().join(' ');
  const inr = (text.match(/₹|\bINR\b|\bRs\.?(?=\s|\d)|rupee/gi) ?? []).length;
  const usd = (text.match(/\$|\bUSD\b|US\s?dollar/gi) ?? []).length;
  return inr > usd ? 'INR' : usd > inr ? 'USD' : null;
}

/**
 * Maps statement rows (from CSV or Excel) to transactions. Finds the header row even below a bank's
 * preamble, and handles a signed `Amount`, an `Amount` plus `Dr/Cr` column, or separate
 * `Debit`/`Withdrawal` and `Credit`/`Deposit` columns (common in Indian banks). Outflows are negative.
 */
export function importRows(all: string[][], { dayFirst }: { dayFirst: boolean }): StatementImport {
  const start = all.slice(0, 30).findIndex(isHeader);
  const header = all[start] ?? [];
  const body = start >= 0 ? all.slice(start + 1) : [];
  const date = find(header, 'date');
  const desc = find(header, 'description', 'narration', 'details', 'particulars', 'payee', 'memo', 'remarks', 'merchant');
  const amount = find(header, 'amount');
  const debit = find(header, 'debit', 'withdrawal');
  const credit = find(header, 'credit', 'deposit');
  const drcr = header.findIndex((h) => /^(dr\s*\/\s*cr|cr\s*\/\s*dr|type|transaction type)$/i.test(h.trim()));
  const result: StatementImport = { rows: [], errors: [], currency: detectCurrency(all) };
  if (start < 0 || desc < 0 || (amount < 0 && debit < 0 && credit < 0)) {
    result.errors.push({ line: 1, reason: 'Need Date, Description and Amount (or Debit/Credit) columns' });
    return result;
  }
  const seen = new Map<string, number>();
  body.forEach((cols, i) => {
    const line = start + i + 2;
    if (cols.every((c) => !c.trim())) return;
    // Footer rows ("Closing balance", totals) have no date: skip them quietly.
    if (!cols[date]?.trim() && /total|balance|closing|opening/i.test(cols.join(' '))) return;
    const postedOn = normaliseDate(cols[date] ?? '', dayFirst);
    let minor: number | null;
    // Separate Debit/Credit columns win: their headers often also say "Amount" ("Withdrawal Amount").
    if (debit < 0 && credit < 0) {
      const raw = cols[amount] ?? '';
      minor = parseToMinor(raw.replace(/\s*(dr|cr)\.?$/i, ''));
      const flag = ((drcr >= 0 && cols[drcr]?.trim()) || raw).trim();
      if (minor !== null && /^(dr|debit|d)\b|dr\.?$/i.test(flag)) minor = -Math.abs(minor);
      else if (minor !== null && /^(cr|credit|c)\b|cr\.?$/i.test(flag)) minor = Math.abs(minor);
    } else {
      const out = parseToMinor(cols[debit] || '0');
      const inn = parseToMinor(cols[credit] || '0');
      minor = out === null || inn === null ? null : inn - Math.abs(out);
    }
    if (!postedOn) return result.errors.push({ line, reason: `Bad date "${cols[date] ?? ''}"` });
    if (minor === null) return result.errors.push({ line, reason: 'Bad amount' });
    const description = (cols[desc] ?? '').trim().replace(/\s+/g, ' ');
    const base = hashRow(postedOn, description, String(minor));
    // Two identical rows on the same day are both real (e.g. two coffees): number them.
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    result.rows.push({ postedOn, description, amount: minor, externalId: n === 1 ? base : `${base}_${n}` });
  });
  return result;
}

/** CSV/TSV text → transactions (see importRows). */
export function importStatement(text: string, opts: { dayFirst: boolean }): StatementImport {
  return importRows(parseCsv(text), opts);
}

/** Excel cell values → the strings importRows expects (dates as ISO, numbers without float noise). */
export function cellToString(v: unknown): string {
  if (v instanceof Date) return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return v == null ? '' : String(v);
}

const CATEGORY_HINTS: [RegExp, string][] = [
  [/salary|payroll|stipend/i, 'Salary'],
  [/rent|landlord|maintenance|society/i, 'Housing'],
  [/bigbasket|blinkit|zepto|grofers|dmart|whole ?foods|trader joe|kroger|safeway|walmart|costco|grocery|instamart/i, 'Groceries'],
  [/swiggy|zomato|restaurant|cafe|coffee|starbucks|mcdonald|domino|pizza|doordash|ubereats|grubhub|chipotle/i, 'Food & dining'],
  [/uber|ola|rapido|lyft|metro|irctc|petrol|fuel|shell|parking|fastag/i, 'Transport'],
  [/netflix|spotify|prime|hotstar|youtube|apple\.com|icloud|google ?one|chatgpt|openai|adobe|subscription/i, 'Subscriptions'],
  [/amazon|flipkart|myntra|ajio|nykaa|target|best ?buy|ebay|etsy/i, 'Shopping'],
  [/electric|bescom|tata power|water|gas|airtel|jio|vodafone|verizon|at&t|t-mobile|comcast|broadband|internet/i, 'Bills & utilities'],
];

/** Best-guess category name for a statement line, or null. The user can change it before importing. */
export function guessCategory(text: string, amount: number): string | null {
  const hit = CATEGORY_HINTS.find(([re]) => re.test(text))?.[1] ?? null;
  if (hit === 'Salary' && amount < 0) return null;
  return hit;
}

/** Cleans UPI / card narrations into a merchant name: `UPI/123/SWIGGY/swiggy@icici` → `Swiggy`. */
export function merchantFromNarration(narration: string): string {
  let raw: string;
  if (/^UPI[/-]/i.test(narration)) {
    // Segments are separated by / or -; skip the UPI tag, direction codes, reference numbers and VPAs.
    const parts = narration.split(/[/-]/).slice(1).map((p) => p.trim());
    raw = parts.find((p) => /[a-z]{3,}/i.test(p) && !p.includes('@') && !/^(DR|CR|P2M|P2A)$/i.test(p)) ?? narration;
  } else {
    raw = narration.replace(/^(POS|ACH|DEBIT CARD|CARD)\s*[-:]?\s*/i, '').split(/\s{2,}|\*| #/)[0]!;
  }
  return raw
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
