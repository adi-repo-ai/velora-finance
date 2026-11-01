import { CURRENCY_BY_COUNTRY, monthKey, type Currency } from '@velora/core';
import {
  accountSchema, billSchema, budgetLineSchema, goalSchema, profileSchema, transactionSchema,
  type AccountInput, type BillInput, type Database, type GoalInput, type ProfileInput, type TransactionInput,
} from '@velora/schemas';
import { parseToMinor } from '@velora/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, createElement, useContext, type ReactNode } from 'react';

export type VeloraClient = SupabaseClient<Database>;

const ClientContext = createContext<VeloraClient | null>(null);

export function VeloraDataProvider({ client, children }: { client: VeloraClient; children: ReactNode }) {
  return createElement(ClientContext.Provider, { value: client }, children);
}

export function useSupabase() {
  const client = useContext(ClientContext);
  if (!client) throw new Error('useSupabase must be used inside <VeloraDataProvider>');
  return client;
}

/** Throws Supabase errors so TanStack Query surfaces them as `error`. */
function must<T>({ data, error }: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (error) throw new Error(error.message);
  return data as NonNullable<T>;
}

async function currentUser(sb: VeloraClient) {
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) throw new Error(error?.message ?? 'Not signed in');
  return data.user;
}

export const keys = {
  profile: ['profile'] as const,
  accounts: ['accounts'] as const,
  categories: ['categories'] as const,
  transactions: (month: string) => ['transactions', month] as const,
  summary: (month: string) => ['summary', month] as const,
  budget: (month: string) => ['budget', month] as const,
  netWorth: (months: number) => ['net-worth', months] as const,
  goals: ['goals'] as const,
  bills: ['bills'] as const,
};

// Any write can move balances, summaries and budgets, so refresh everything money-related.
const MONEY_KEYS = ['accounts', 'transactions', 'summary', 'budget', 'net-worth'];
function useInvalidateMoney() {
  const qc = useQueryClient();
  return () => Promise.all(MONEY_KEYS.map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

// ───────────────────────── reads ─────────────────────────

export function useProfile() {
  const sb = useSupabase();
  return useQuery({
    queryKey: keys.profile,
    queryFn: async () => must(await sb.from('profiles').select('*').single()),
  });
}

/** Base currency for display; USD until the profile has loaded. */
export function useCurrency(): Currency {
  return useProfile().data?.base_currency ?? 'USD';
}

export function useAccounts() {
  const sb = useSupabase();
  return useQuery({
    queryKey: keys.accounts,
    queryFn: async () => must(await sb.from('account_balances').select('*').eq('is_archived', false).order('name')),
  });
}

export function useCategories() {
  const sb = useSupabase();
  return useQuery({
    queryKey: keys.categories,
    queryFn: async () => must(await sb.from('categories').select('*').order('name')),
    staleTime: Infinity,
  });
}

export function useTransactions(month = monthKey()) {
  const sb = useSupabase();
  return useQuery({
    queryKey: keys.transactions(month),
    queryFn: async () => {
      const end = new Date(month);
      end.setUTCMonth(end.getUTCMonth() + 1);
      return must(
        await sb
          .from('transactions')
          .select('*, category:categories(name, icon, color), account:accounts(name, currency)')
          .gte('posted_on', month)
          .lt('posted_on', end.toISOString().slice(0, 10))
          .order('posted_on', { ascending: false })
          .order('created_at', { ascending: false }),
      );
    },
  });
}

export function useMonthSummary(month = monthKey()) {
  const sb = useSupabase();
  return useQuery({
    queryKey: keys.summary(month),
    queryFn: async () => {
      const rows = must(await sb.rpc('month_summary', { p_month: month }));
      const income = rows.filter((r) => r.total > 0).reduce((s, r) => s + r.total, 0);
      const spent = -rows.filter((r) => r.total < 0 && r.kind === 'expense').reduce((s, r) => s + r.total, 0);
      return { rows, income, spent, net: rows.reduce((s, r) => s + r.total, 0) };
    },
  });
}

export function useBudget(month = monthKey()) {
  const sb = useSupabase();
  return useQuery({
    queryKey: keys.budget(month),
    queryFn: async () => must(await sb.rpc('budget_progress', { p_month: month })),
  });
}

export function useNetWorth(months = 12) {
  const sb = useSupabase();
  return useQuery({
    queryKey: keys.netWorth(months),
    queryFn: async () => must(await sb.rpc('net_worth_history', { p_months: months })),
  });
}

export function useGoals() {
  const sb = useSupabase();
  return useQuery({
    queryKey: keys.goals,
    queryFn: async () => must(await sb.from('goals').select('*').order('created_at')),
  });
}

/** Recurring payments; pass a kind to get only bills or only subscriptions (default: both). */
export function useBills(kind?: 'bill' | 'subscription') {
  const sb = useSupabase();
  return useQuery({
    queryKey: [...keys.bills, kind ?? 'all'],
    queryFn: async () => {
      const q = sb.from('recurring_items').select('*').order('next_due_on');
      return must(await (kind ? q.eq('kind', kind) : q));
    },
  });
}

/** The signed-in user (email, sign-in methods) from Supabase Auth. */
export function useAuthUser() {
  const sb = useSupabase();
  return useQuery({
    queryKey: ['auth-user'],
    queryFn: () => currentUser(sb),
  });
}

// ───────────────────────── writes ─────────────────────────

export function useAddAccount() {
  const sb = useSupabase();
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async (input: AccountInput) => {
      const a = accountSchema.parse(input);
      const opening = parseToMinor(a.openingBalance);
      if (opening === null) throw new Error('Enter a valid balance');
      const owed = a.type === 'credit' || a.type === 'loan';
      return must(
        await sb
          .from('accounts')
          .insert({
            name: a.name, type: a.type, currency: a.currency,
            institution: a.institution || null, mask: a.mask || null,
            opening_balance: owed ? -Math.abs(opening) : opening,
          })
          .select()
          .single(),
      );
    },
    onSuccess: invalidate,
  });
}

export function useAddTransaction() {
  const sb = useSupabase();
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      const t = transactionSchema.parse(input);
      return must(
        await sb
          .from('transactions')
          .insert({
            account_id: t.accountId, category_id: t.categoryId ?? null, posted_on: t.postedOn,
            amount: t.kind === 'expense' ? -t.amount : t.amount,
            description: t.description, notes: t.notes ?? null, source: 'manual',
          })
          .select()
          .single(),
      );
    },
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const sb = useSupabase();
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async (id: string) => must(await sb.from('transactions').delete().eq('id', id)),
    onSuccess: invalidate,
  });
}

export type ImportRow = { postedOn: string; description: string; amount: number; externalId: string; merchant?: string };

/** Upserts on (account_id, external_id): re-importing a statement never duplicates rows. */
export function useImportTransactions() {
  const sb = useSupabase();
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async ({ accountId, rows }: { accountId: string; rows: ImportRow[] }) => {
      const data = must(
        await sb
          .from('transactions')
          .upsert(
            rows.filter((r) => r.amount !== 0).map((r) => ({
              account_id: accountId, posted_on: r.postedOn, amount: r.amount, description: r.description,
              merchant: r.merchant ?? null, external_id: r.externalId, source: 'import' as const,
            })),
            { onConflict: 'account_id,external_id', ignoreDuplicates: true },
          )
          .select('id'),
      );
      return { inserted: data.length, skipped: rows.length - data.length };
    },
    onSuccess: invalidate,
  });
}

export function useSetBudgetLine(month = monthKey()) {
  const sb = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { categoryId: string; amount: string }) => {
      const b = budgetLineSchema.parse(input);
      return must(
        await sb
          .from('budget_lines')
          .upsert({ month, category_id: b.categoryId, amount: b.amount }, { onConflict: 'user_id,month,category_id' })
          .select()
          .single(),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.budget(month) }),
  });
}

export function useAddGoal() {
  const sb = useSupabase();
  const qc = useQueryClient();
  const currency = useCurrency();
  return useMutation({
    mutationFn: async (input: GoalInput) => {
      const g = goalSchema.parse(input);
      return must(
        await sb
          .from('goals')
          .insert({ name: g.name, emoji: g.emoji, target_amount: g.target, target_date: g.targetDate ?? null, currency })
          .select()
          .single(),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.goals }),
  });
}

export function useContribute() {
  const sb = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ goalId, amount }: { goalId: string; amount: number }) =>
      must(await sb.rpc('contribute_to_goal', { p_goal: goalId, p_amount: amount })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.goals }),
  });
}

export function useAddBill() {
  const sb = useSupabase();
  const qc = useQueryClient();
  const currency = useCurrency();
  return useMutation({
    mutationFn: async (input: BillInput) => {
      const b = billSchema.parse(input);
      return must(
        await sb
          .from('recurring_items')
          .insert({
            name: b.name, amount: b.amount, currency, cadence: b.cadence, next_due_on: b.nextDueOn,
            remind_days_before: b.remindDaysBefore, autopay: b.autopay, kind: b.kind, website: b.website ?? null,
          })
          .select()
          .single(),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.bills }),
  });
}

export function useMarkBillPaid() {
  const sb = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => must(await sb.rpc('mark_bill_paid', { p_item: id })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.bills }),
  });
}

/** Deletes one row the user owns. Security rules stop anyone deleting other people's rows. */
function useDeleteRow(table: 'accounts' | 'recurring_items' | 'goals', invalidate: () => unknown) {
  const sb = useSupabase();
  return useMutation({
    mutationFn: async (id: string) => must(await sb.from(table).delete().eq('id', id)),
    onSuccess: invalidate,
  });
}

/** Also deletes the account's transactions (database cascade). */
export function useDeleteAccount() {
  return useDeleteRow('accounts', useInvalidateMoney());
}

export function useDeleteBill() {
  const qc = useQueryClient();
  return useDeleteRow('recurring_items', () => qc.invalidateQueries({ queryKey: keys.bills }));
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useDeleteRow('goals', () => qc.invalidateQueries({ queryKey: keys.goals }));
}

export function useUpdateProfile() {
  const sb = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProfileInput) => {
      const p = profileSchema.parse(input);
      return must(
        await sb
          .from('profiles')
          .update({ display_name: p.displayName, home_country: p.homeCountry, base_currency: CURRENCY_BY_COUNTRY[p.homeCountry] })
          .eq('id', (await currentUser(sb)).id)
          .select()
          .single(),
      );
    },
    // Currency affects every report, so refresh everything.
    onSuccess: () => qc.invalidateQueries(),
  });
}

/** Permanently deletes the user and all their data, then signs out. */
export function useDeleteMyAccount() {
  const sb = useSupabase();
  return useMutation({
    mutationFn: async () => {
      must(await sb.rpc('delete_my_account'));
      await sb.auth.signOut();
    },
  });
}

export function useSavePushToken() {
  const sb = useSupabase();
  return useMutation({
    mutationFn: async ({ token, platform }: { token: string; platform: 'ios' | 'android' }) =>
      must(await sb.from('push_tokens').upsert({ token, platform, updated_at: new Date().toISOString() })),
  });
}
