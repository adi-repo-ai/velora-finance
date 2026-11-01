import { describe, expect, it } from 'vitest';
import {
  budgetStatus, formatCompact, formatMoney, importStatement, merchantFromNarration,
  normaliseDate, parseCsv, parseToMinor, safeToSpendToday, splitCents,
} from './index';

describe('money', () => {
  it('formats USD and INR with locale grouping', () => {
    expect(formatMoney(28451260, 'USD', { cents: true })).toBe('$284,512.60');
    expect(formatMoney(248530000, 'INR')).toBe('₹24,85,300');
    expect(formatMoney(-48600, 'INR', { sign: true })).toBe('-₹486');
  });
  it('compacts', () => {
    expect(formatCompact(142000000, 'INR')).toBe('₹14.2 L');
    expect(formatCompact(2500000000, 'INR')).toBe('₹2.5 Cr');
    expect(formatCompact(210000, 'INR')).toBe('₹2.1k');
    expect(formatCompact(123456789, 'USD')).toBe('$1.2M');
    expect(formatCompact(-50000, 'USD')).toBe('−$500');
  });
  it('splits cents for the hero style', () => {
    expect(splitCents(28451260, 'USD')).toEqual({ whole: '$284,512', cents: '.60' });
  });
  it('parses without float drift', () => {
    expect(parseToMinor('0.29')).toBe(29);
    expect(parseToMinor('1,234.5')).toBe(123450);
    expect(parseToMinor('₹1,23,456')).toBe(12345600);
    expect(parseToMinor('(42.10)')).toBe(-4210);
    expect(parseToMinor('-$5')).toBe(-500);
    expect(parseToMinor('Rs. 99')).toBe(9900);
    expect(parseToMinor('1.234')).toBeNull();
    expect(parseToMinor('abc')).toBeNull();
    expect(parseToMinor('')).toBeNull();
  });
});

describe('csv import', () => {
  it('parses quotes and CRLF', () => {
    expect(parseCsv('a,"b,""c"""\r\n1,2\n\n')).toEqual([['a', 'b,"c"'], ['1', '2']]);
  });
  it('normalises dates', () => {
    expect(normaliseDate('03/11/2026', true)).toBe('2026-11-03');
    expect(normaliseDate('03/11/2026', false)).toBe('2026-03-11');
    expect(normaliseDate('2026-10-30T00:00', false)).toBe('2026-10-30');
    expect(normaliseDate('31/13/26', true)).toBeNull();
  });
  it('imports an Indian debit/credit statement and dedupes ids', () => {
    const csv = 'Date,Narration,Withdrawal Amt.,Deposit Amt.\n' +
      '28/10/2026,UPI/4021/SWIGGY/swiggy@icici,486.00,\n' +
      '28/10/2026,SALARY INFOSYS,,"1,85,000.00"\n' +
      '28/10/2026,UPI/4021/SWIGGY/swiggy@icici,486.00,\n' +
      'bad,row,1,\n';
    const r = importStatement(csv, { dayFirst: true });
    expect(r.rows.map((x) => x.amount)).toEqual([-48600, 18500000, -48600]);
    expect(r.rows[0]!.postedOn).toBe('2026-10-28');
    expect(new Set(r.rows.map((x) => x.externalId)).size).toBe(3);
    expect(r.errors).toEqual([{ line: 5, reason: 'Bad date "bad"' }]);
    // Re-import yields identical ids → DB unique key dedupes.
    expect(importStatement(csv, { dayFirst: true }).rows.map((x) => x.externalId)).toEqual(r.rows.map((x) => x.externalId));
  });
  it('imports a US signed-amount statement', () => {
    const r = importStatement('Posting Date,Description,Amount\n10/29/2026,WHOLEFDS MKT #10234,-86.42\n', { dayFirst: false });
    expect(r.rows[0]).toMatchObject({ postedOn: '2026-10-29', amount: -8642 });
  });
  it('rejects files without required columns', () => {
    expect(importStatement('foo,bar\n1,2', { dayFirst: true }).errors).toHaveLength(1);
  });
  it('extracts merchants', () => {
    expect(merchantFromNarration('UPI/4021/SWIGGY/swiggy@icici')).toBe('Swiggy');
    expect(merchantFromNarration('UPI-ZOMATO LTD-zomato@hdfc')).toBe('Zomato Ltd');
    expect(merchantFromNarration('POS WHOLEFDS MKT #10234')).toBe('Wholefds Mkt');
    expect(merchantFromNarration('UPI/DR/412345678901/BLINKIT/YESB/blinkit@yes')).toBe('Blinkit');
  });
});

describe('budget', () => {
  it('classifies', () => {
    expect(budgetStatus({ budgeted: 1000, spent: 1100 }).state).toBe('over');
    expect(budgetStatus({ budgeted: 1000, spent: 900 }).state).toBe('near');
    expect(budgetStatus({ budgeted: 0, spent: 0 }).state).toBe('ok');
  });
  it('safe to spend spreads over remaining days and floors at zero', () => {
    const today = new Date(2026, 9, 30); // Oct 30 → 2 days incl. today
    expect(safeToSpendToday({ remainingBudget: 10000, billsDue: 2000, today })).toBe(4000);
    expect(safeToSpendToday({ remainingBudget: 1000, billsDue: 2000, today })).toBe(0);
  });
});

import { domainFromInput, monthlyCost } from './index';

describe('recurring', () => {
  it('normalises cost to per month', () => {
    expect(monthlyCost(1200, 'monthly')).toBe(1200);
    expect(monthlyCost(1200, 'yearly')).toBe(100);
    expect(monthlyCost(1200, 'weekly')).toBe(5200);
  });
  it('cleans website input into a domain', () => {
    expect(domainFromInput('https://www.Netflix.com/in/')).toBe('netflix.com');
    expect(domainFromInput('open.spotify.com')).toBe('open.spotify.com');
    expect(domainFromInput('hotstar.com:443/x?y')).toBe('hotstar.com');
    expect(domainFromInput('netflix')).toBeNull();
    expect(domainFromInput('')).toBeNull();
  });
});

import { generatePassword, passwordStrength } from './index';

describe('password', () => {
  it('generates strong passwords with every character class', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword();
      expect(pw).toHaveLength(16);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/\d/);
      expect(pw).toMatch(/[^A-Za-z0-9]/);
      expect(pw).not.toMatch(/[0O1lI]/);
    }
    expect(new Set(Array.from({ length: 20 }, () => generatePassword())).size).toBe(20);
  });

  it('rates strength', () => {
    expect(passwordStrength('abc').label).toBe('Too short');
    expect(passwordStrength('password1').label).toBe('Weak');
    expect(passwordStrength('aaaaaaaaaaaa').score).toBe(1);
    expect(passwordStrength('Sunset-river-42').label).toBe('Strong');
    expect(passwordStrength(generatePassword()).label).toBe('Strong');
  });
});

import { cellToString, detectCurrency, guessCategory, importRows } from './index';

describe('import: any statement format', () => {
  it('reads semicolon CSV with a bank preamble and footer', () => {
    const csv = 'Account statement;HDFC Bank\nCustomer;Priya\n\nDate;Narration;Withdrawal Amount (INR);Deposit Amount (INR);Closing Balance\n'
      + '01/11/26;UPI/1/SWIGGY/swiggy@icici;486.00;;₹10,000\n02/11/26;SALARY INFOSYS;;1,85,000.00;₹1,95,000\n;Closing balance;;;₹1,95,000\n';
    const r = importStatement(csv, { dayFirst: true });
    expect(r.errors).toEqual([]);
    expect(r.rows.map((x) => [x.postedOn, x.amount])).toEqual([['2026-11-01', -48600], ['2026-11-02', 18500000]]);
    expect(r.currency).toBe('INR');
  });
  it('uses a Dr/Cr column or suffix to sign a single amount', () => {
    const r = importStatement('Txn Date\tDescription\tAmount\tDr/Cr\n2026-11-01\tRent\t25000\tDR\n2026-11-02\tRefund\t500\tCR\n2026-11-03\tATM\t2000 Dr\t\n', { dayFirst: true });
    expect(r.rows.map((x) => x.amount)).toEqual([-2500000, 50000, -200000]);
  });
  it('detects currency from symbols and codes', () => {
    expect(detectCurrency([['Date', 'Amount'], ['1', '$12.00']])).toBe('USD');
    expect(detectCurrency([['Amount (INR)'], ['Rs. 400']])).toBe('INR');
    expect(detectCurrency([['Date', 'Amount'], ['1', '12']])).toBeNull();
  });
  it('turns Excel cells into importable rows', () => {
    const rows = [['Date', 'Description', 'Amount'], [new Date(2026, 10, 1), 'Coffee', -4.5], [new Date(2026, 10, 2), 'Paycheck', 2500]].map((r) => r.map(cellToString));
    expect(importRows(rows, { dayFirst: false }).rows.map((x) => [x.postedOn, x.amount])).toEqual([['2026-11-01', -450], ['2026-11-02', 250000]]);
  });
  it('guesses categories from merchant text', () => {
    expect(guessCategory('UPI/SWIGGY', -100)).toBe('Food & dining');
    expect(guessCategory('ACME PAYROLL', 100)).toBe('Salary');
    expect(guessCategory('Mystery shop', -100)).toBeNull();
  });
});
