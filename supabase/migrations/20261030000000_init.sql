-- Velora core schema. Money = bigint minor units (cents/paise) + ISO currency.
-- Every user table has RLS; clients only ever see their own rows.

create type public.country as enum ('US', 'IN');
create type public.currency as enum ('USD', 'INR');
create type public.account_type as enum ('checking', 'savings', 'credit', 'loan', 'investment', 'cash', 'wallet');
create type public.category_kind as enum ('income', 'expense', 'transfer');
create type public.txn_source as enum ('manual', 'import', 'sync');
create type public.cadence as enum ('weekly', 'monthly', 'yearly');

-- ───────────────────────── profiles ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  home_country public.country not null default 'US',
  base_currency public.currency not null default 'USD',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

-- Profile is created from sign-up metadata: { display_name, home_country }.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  c public.country := coalesce(nullif(new.raw_user_meta_data ->> 'home_country', '')::public.country, 'US');
begin
  insert into public.profiles (id, display_name, home_country, base_currency, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    c,
    case c when 'IN' then 'INR'::public.currency else 'USD'::public.currency end,
    case c when 'IN' then 'Asia/Kolkata' else 'America/New_York' end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── accounts ─────────────────────────
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  type public.account_type not null,
  currency public.currency not null,
  institution text,
  mask text check (mask ~ '^[0-9]{2,4}$'),
  opening_balance bigint not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, user_id) -- lets child tables enforce same-owner FKs
);
create index on public.accounts (user_id);

-- ───────────────────────── categories ─────────────────────────
-- user_id null = built-in category visible to everyone.
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(name) between 1 and 40),
  kind public.category_kind not null default 'expense',
  icon text not null default '•',
  color text not null default 'gold-1',
  created_at timestamptz not null default now()
);
create index on public.categories (user_id);

insert into public.categories (user_id, name, kind, icon, color) values
  (null, 'Salary', 'income', '💼', 'positive'),
  (null, 'Other income', 'income', '✨', 'positive'),
  (null, 'Housing', 'expense', '🏠', 'lilac'),
  (null, 'Groceries', 'expense', '🛒', 'sky'),
  (null, 'Food & dining', 'expense', '🍽️', 'negative'),
  (null, 'Transport', 'expense', '🚕', 'positive'),
  (null, 'Shopping', 'expense', '🛍️', 'gold-1'),
  (null, 'Bills & utilities', 'expense', '⚡', 'sky'),
  (null, 'Subscriptions', 'expense', '🎬', 'lilac'),
  (null, 'Health', 'expense', '🩺', 'positive'),
  (null, 'Travel', 'expense', '✈️', 'sky'),
  (null, 'Investments', 'transfer', '📈', 'gold-1'),
  (null, 'Transfer', 'transfer', '⇄', 'faint');

-- ───────────────────────── transactions ─────────────────────────
-- amount < 0 = money out, > 0 = money in. currency always equals the account's.
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null,
  posted_on date not null,
  amount bigint not null check (amount <> 0),
  description text not null default '' check (length(description) <= 300),
  merchant text check (length(merchant) <= 120),
  category_id uuid references public.categories (id) on delete set null,
  source public.txn_source not null default 'manual',
  external_id text,
  notes text check (length(notes) <= 1000),
  created_at timestamptz not null default now(),
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete cascade,
  unique (account_id, external_id)
);
create index on public.transactions (user_id, posted_on desc);

-- ───────────────────────── budgets ─────────────────────────
create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  category_id uuid not null references public.categories (id) on delete cascade,
  amount bigint not null check (amount >= 0),
  unique (user_id, month, category_id)
);

-- ───────────────────────── goals ─────────────────────────
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(name) between 1 and 60),
  emoji text not null default '🎯',
  currency public.currency not null,
  target_amount bigint not null check (target_amount > 0),
  saved_amount bigint not null default 0 check (saved_amount >= 0),
  target_date date,
  created_at timestamptz not null default now()
);

-- ───────────────────────── bills / recurring ─────────────────────────
create table public.recurring_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(name) between 1 and 60),
  amount bigint not null check (amount > 0),
  currency public.currency not null,
  cadence public.cadence not null default 'monthly',
  next_due_on date not null,
  remind_days_before int not null default 3 check (remind_days_before between 0 and 30),
  autopay boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.recurring_items (next_due_on);

-- ───────────────────────── push ─────────────────────────
create table public.push_tokens (
  token text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

-- Written only by the reminders function (service role); makes sends idempotent.
create table public.notifications_log (
  recurring_item_id uuid not null references public.recurring_items (id) on delete cascade,
  due_on date not null,
  sent_at timestamptz not null default now(),
  primary key (recurring_item_id, due_on)
);

-- ───────────────────────── RLS ─────────────────────────
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budget_lines enable row level security;
alter table public.goals enable row level security;
alter table public.recurring_items enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notifications_log enable row level security; -- no policies: service role only

create policy "own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "read built-in and own" on public.categories for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy "write own" on public.categories for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['accounts', 'transactions', 'budget_lines', 'goals', 'recurring_items', 'push_tokens'] loop
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Categories referenced by a user's rows must be visible to that user.
create function public.category_visible(cid uuid) returns boolean
language sql stable set search_path = '' as $$
  select cid is null or exists (
    select 1 from public.categories c where c.id = cid and (c.user_id is null or c.user_id = auth.uid()))
$$;
alter table public.transactions add constraint category_visible check (public.category_visible(category_id)) not valid;
alter table public.budget_lines add constraint category_visible check (public.category_visible(category_id)) not valid;

-- ───────────────────────── reporting (security invoker → RLS applies) ─────────────────────────
create view public.account_balances with (security_invoker = true) as
  select a.id, a.user_id, a.name, a.type, a.currency, a.institution, a.mask, a.is_archived,
         a.opening_balance + coalesce(sum(t.amount), 0) as balance
  from public.accounts a left join public.transactions t on t.account_id = a.id
  group by a.id;

-- shortcut: totals only include accounts in the user's base currency; add FX conversion
-- (fx_rates table) when users hold accounts in both USD and INR.
create function public.month_summary(p_month date)
returns table (category_id uuid, name text, icon text, color text, kind public.category_kind, total bigint)
language sql stable security invoker set search_path = '' as $$
  select c.id, coalesce(c.name, 'Uncategorised'), coalesce(c.icon, '•'), coalesce(c.color, 'faint'),
         coalesce(c.kind, case when sum(t.amount) > 0 then 'income' else 'expense' end::public.category_kind),
         sum(t.amount)::bigint
  from public.transactions t
  join public.accounts a on a.id = t.account_id
  join public.profiles p on p.id = t.user_id and p.base_currency = a.currency
  left join public.categories c on c.id = t.category_id
  where t.posted_on >= p_month and t.posted_on < (p_month + interval '1 month')
  group by c.id, c.name, c.icon, c.color, c.kind
  order by abs(sum(t.amount)) desc
$$;

create function public.budget_progress(p_month date)
returns table (category_id uuid, name text, icon text, color text, budgeted bigint, spent bigint)
language sql stable security invoker set search_path = '' as $$
  select c.id, c.name, c.icon, c.color, b.amount,
         coalesce((select -sum(t.amount) from public.transactions t
                   join public.accounts a on a.id = t.account_id
                   join public.profiles p on p.id = t.user_id and p.base_currency = a.currency
                   where t.category_id = c.id and t.amount < 0
                     and t.posted_on >= p_month and t.posted_on < (p_month + interval '1 month')), 0)::bigint
  from public.budget_lines b join public.categories c on c.id = b.category_id
  where b.month = p_month
  order by b.amount desc
$$;

-- Net worth at each month end for the last p_months months (base currency accounts).
create function public.net_worth_history(p_months int default 12)
returns table (month date, net_worth bigint)
language sql stable security invoker set search_path = '' as $$
  with months as (
    select (date_trunc('month', now()) - (n || ' month')::interval)::date as m
    from generate_series(0, least(greatest(p_months, 1), 120) - 1) n
  )
  select m.m,
    (coalesce((select sum(a.opening_balance) from public.accounts a
               join public.profiles p on p.id = a.user_id and p.base_currency = a.currency), 0)
     + coalesce((select sum(t.amount) from public.transactions t
                 join public.accounts a on a.id = t.account_id
                 join public.profiles p on p.id = t.user_id and p.base_currency = a.currency
                 where t.posted_on < (m.m + interval '1 month')), 0))::bigint
  from months m order by m.m
$$;

-- Adds money to a goal atomically (avoids lost updates from read-modify-write on clients).
create function public.contribute_to_goal(p_goal uuid, p_amount bigint)
returns public.goals
language sql security invoker set search_path = '' as $$
  update public.goals set saved_amount = saved_amount + p_amount
  where id = p_goal and p_amount > 0
  returning *
$$;

-- Marks a bill paid and rolls it to its next due date.
create function public.mark_bill_paid(p_item uuid)
returns public.recurring_items
language sql security invoker set search_path = '' as $$
  update public.recurring_items set next_due_on = (next_due_on + case cadence
      when 'weekly' then interval '1 week' when 'monthly' then interval '1 month' else interval '1 year' end)::date
  where id = p_item
  returning *
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
