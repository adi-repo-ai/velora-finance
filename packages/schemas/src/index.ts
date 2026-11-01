import { domainFromInput, parseToMinor } from '@velora/core';
import { z } from 'zod';

export * from './database.types';

export const SUBSCRIPTION_CATEGORIES = [
  'streaming', 'music', 'cloud', 'software', 'ai', 'gaming', 'news', 'fitness', 'education', 'food', 'shopping', 'telecom', 'other',
] as const;

export const currencySchema = z.enum(['USD', 'INR']);
export const countrySchema = z.enum(['US', 'IN']);

/** User-typed amount ("1,250.50") → positive minor units. */
export const amountInput = z
  .string()
  .trim()
  .transform((s, ctx) => {
    const minor = parseToMinor(s);
    if (minor === null || minor <= 0) {
      ctx.addIssue({ code: 'custom', message: 'Enter an amount greater than 0' });
      return z.NEVER;
    }
    return minor;
  });

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date');

export const signUpSchema = z.object({
  displayName: z.string().trim().min(1, 'Tell us your name').max(60),
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
  homeCountry: countrySchema,
});

export const signInSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

export const accountSchema = z.object({
  name: z.string().trim().min(1, 'Name the account').max(80),
  type: z.enum(['checking', 'savings', 'credit', 'loan', 'investment', 'cash', 'wallet']),
  currency: currencySchema,
  institution: z.string().trim().max(80).optional(),
  mask: z.union([z.string().regex(/^\d{2,4}$/, 'Last 2–4 digits'), z.literal('')]).optional(),
  /** Balance today as typed; credit/loan balances are stored negative. */
  openingBalance: z.string().trim().default('0'),
});

export const transactionSchema = z.object({
  kind: z.enum(['expense', 'income']),
  amount: amountInput,
  accountId: z.uuid('Pick an account'),
  categoryId: z.uuid().optional(),
  postedOn: isoDate,
  description: z.string().trim().max(300).default(''),
  notes: z.string().trim().max(1000).optional(),
});

export const budgetLineSchema = z.object({
  categoryId: z.uuid(),
  amount: amountInput,
});

export const goalSchema = z.object({
  name: z.string().trim().min(1, 'Name your goal').max(60),
  emoji: z.string().max(8).default('🎯'),
  target: amountInput,
  targetDate: isoDate.optional(),
});

export const billSchema = z.object({
  name: z.string().trim().min(1, 'Name the bill').max(60),
  amount: amountInput,
  cadence: z.enum(['weekly', 'monthly', 'yearly']),
  nextDueOn: isoDate,
  remindDaysBefore: z.coerce.number().int().min(0).max(30).default(3),
  autopay: z.boolean().default(false),
  kind: z.enum(['bill', 'subscription']).default('bill'),
  category: z.enum(SUBSCRIPTION_CATEGORIES).optional(),
  description: z.string().trim().max(300, 'Keep it under 300 characters').optional(),
  accountEmail: z.union([z.email('Enter a valid email'), z.literal('')]).optional(),
  /** Re-encoded raster image from the logo picker; mirrors the database check. */
  logo: z
    .string()
    .max(60000, 'Logo is too large')
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, 'Use a PNG, JPG or WebP image')
    .optional(),
  notify: z.boolean().default(true),
  /** Optional website for the brand logo; accepts a URL or bare domain. */
  website: z
    .string()
    .trim()
    .optional()
    .transform((s, ctx) => {
      if (!s) return undefined;
      const d = domainFromInput(s);
      if (!d) {
        ctx.addIssue({ code: 'custom', message: 'Enter a website like netflix.com' });
        return z.NEVER;
      }
      return d;
    }),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, 'Tell us your name').max(60),
  homeCountry: countrySchema,
});

export const emailChangeSchema = z.object({ email: z.email('Enter a valid email') });

export const passwordChangeSchema = z
  .object({ password: z.string().min(8, 'At least 8 characters'), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ['confirm'] });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type AccountInput = z.input<typeof accountSchema>;
export type TransactionInput = z.input<typeof transactionSchema>;
export type GoalInput = z.input<typeof goalSchema>;
export type BillInput = z.input<typeof billSchema>;
export type ProfileInput = z.input<typeof profileSchema>;

/** First validation message per field, for simple forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    out[key] ??= issue.message;
  }
  return out;
}
