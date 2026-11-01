import { describe, expect, it } from 'vitest';
import { accountSchema, billSchema, fieldErrors, transactionSchema } from './index';

const base = { kind: 'expense', accountId: '7d1c3f3e-8b0a-4d7e-9a51-2a8f5f0c1b11', postedOn: '2026-10-30' } as const;

describe('transactionSchema', () => {
  it('turns typed amounts into positive minor units', () => {
    expect(transactionSchema.parse({ ...base, amount: '1,250.50' }).amount).toBe(125050);
  });
  it('rejects zero, negative and junk amounts with a friendly message', () => {
    for (const amount of ['0', '-5', 'abc', '']) {
      const r = transactionSchema.safeParse({ ...base, amount });
      expect(r.success).toBe(false);
      if (!r.success) expect(fieldErrors(r.error).amount).toBe('Enter an amount greater than 0');
    }
  });
  it('requires a real account id and date', () => {
    const r = transactionSchema.safeParse({ ...base, amount: '5', accountId: 'nope', postedOn: '30/10/2026' });
    expect(r.success).toBe(false);
    if (!r.success) expect(Object.keys(fieldErrors(r.error)).sort()).toEqual(['accountId', 'postedOn']);
  });
});

describe('other forms', () => {
  it('validates card masks', () => {
    expect(accountSchema.safeParse({ name: 'Amex', type: 'credit', currency: 'USD', mask: '12a4' }).success).toBe(false);
    expect(accountSchema.safeParse({ name: 'Amex', type: 'credit', currency: 'USD', mask: '' }).success).toBe(true);
  });
  it('bounds reminder days', () => {
    const bill = { name: 'Rent', amount: '2350', cadence: 'monthly', nextDueOn: '2026-11-01' };
    expect(billSchema.parse(bill).remindDaysBefore).toBe(3);
    expect(billSchema.safeParse({ ...bill, remindDaysBefore: 60 }).success).toBe(false);
  });
});

import { passwordChangeSchema } from './index';

describe('subscriptions and settings', () => {
  const sub = { name: 'Netflix', amount: '649', cadence: 'monthly', nextDueOn: '2026-11-10', kind: 'subscription' } as const;
  it('normalises the website to a domain and rejects junk', () => {
    expect(billSchema.parse({ ...sub, website: 'https://www.netflix.com/in/' }).website).toBe('netflix.com');
    expect(billSchema.parse(sub).website).toBeUndefined();
    expect(billSchema.safeParse({ ...sub, website: 'not a site' }).success).toBe(false);
  });
  it('requires matching passwords', () => {
    const r = passwordChangeSchema.safeParse({ password: 'longenough', confirm: 'different' });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).confirm).toBe("Passwords don't match");
  });
});
