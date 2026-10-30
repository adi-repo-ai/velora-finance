import { parseToMinor } from './money';

/** RFC-4180-ish CSV parser: quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
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
    else if (c === ',') {
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

/**
 * Maps a bank statement CSV to transactions. Handles a single signed `Amount` column
 * or separate `Debit`/`Withdrawal` and `Credit`/`Deposit` columns (common in Indian banks).
 * Outflows are negative.
 */
export function importStatement(text: string, { dayFirst }: { dayFirst: boolean }): ImportResult {
  const [header = [], ...body] = parseCsv(text);
  const date = find(header, 'date');
  const desc = find(header, 'description', 'narration', 'details', 'particulars', 'payee', 'memo');
  const amount = find(header, 'amount');
  const debit = find(header, 'debit', 'withdrawal');
  const credit = find(header, 'credit', 'deposit');
  const result: ImportResult = { rows: [], errors: [] };
  if (date < 0 || desc < 0 || (amount < 0 && debit < 0 && credit < 0)) {
    result.errors.push({ line: 1, reason: 'Need Date, Description and Amount (or Debit/Credit) columns' });
    return result;
  }
  const seen = new Map<string, number>();
  body.forEach((cols, i) => {
    const line = i + 2;
    const postedOn = normaliseDate(cols[date] ?? '', dayFirst);
    let minor: number | null;
    if (amount >= 0) minor = parseToMinor(cols[amount] ?? '');
    else {
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
