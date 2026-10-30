# Velora Finance — High-Level Architecture

Personal all-in-one finance app for web, iOS and Android. Launch markets: **USA** and **India**.

## 1. Technology stack (final)

| Layer | Technology | Purpose |
|---|---|---|
| Web frontend | Next.js + React | Responsive web application |
| Language | TypeScript | Type safety |
| Mobile | React Native + Expo | Android and iOS |
| Styling | NativeWind + Tailwind CSS | Consistent styling |
| UI components | shadcn/ui + custom components | Web component library |
| Mobile UI | React Native Paper / custom components | Native UI |
| Monorepo | Turborepo + pnpm | Shared codebase |
| Backend | Supabase | Backend platform |
| Database | PostgreSQL | Financial records |
| Authentication | Supabase Auth | Login and authorization |
| ORM | Prisma (optional) | Database access — see §8 |
| Validation | Zod | Form and API validation |
| File storage | Supabase Storage | Receipts and attachments |
| Server functions | Supabase Edge Functions | Backend operations |
| Background jobs | Scheduled Edge Functions initially | Recurring reminders |
| Caching | React Query / TanStack Query | Client-side data caching |
| Charts | Recharts / Victory Native | Financial analytics |
| Notifications | Expo Push Notifications | Mobile reminders |
| Web hosting | Netlify | Next.js deployment |
| Mobile builds | Expo EAS | Android/iOS builds |
| Monitoring | Sentry | Error tracking |
| Source control | GitHub | Repository management |
| CI/CD | GitHub Actions | Automated testing |

## 2. System overview

```
┌────────────────────────┐        ┌─────────────────────────────┐
│ Web — Next.js (Netlify)│        │ Mobile — Expo RN (EAS)      │
│ shadcn/ui · Tailwind   │        │ RN Paper · NativeWind       │
│ Recharts               │        │ Victory Native · SecureStore│
└───────────┬────────────┘        └──────────────┬──────────────┘
            │   shared: @velora/core · @velora/schemas · @velora/data
            │   (TanStack Query hooks over supabase-js)
            └───────────────────┬────────────────┘
                                │ HTTPS (JWT from Supabase Auth)
┌───────────────────────────────▼──────────────────────────────────┐
│                           SUPABASE                               │
│  Auth (email, Google, Apple, phone OTP for India, MFA)           │
│  PostgREST ──► PostgreSQL (RLS on every table)                   │
│                 pg_cron ──► pg_net ──► scheduled Edge Functions  │
│  Edge Functions (Deno): aggregator link/sync, webhooks,          │
│                 statement import, reminders, price/FX refresh    │
│  Storage (private buckets): receipts, statements, CAS PDFs       │
│  Vault: encrypted aggregator access tokens                       │
└───────┬──────────────────┬──────────────────┬────────────────────┘
        │                  │                  │
   Plaid (US)     India data sources     Expo Push API · Sentry
                  (statements, CAS, AA*)  Price/FX feeds (AMFI NAV, market API)
```

**Principle:** clients read and write user data directly through supabase-js, protected by Row Level Security. Anything that needs a secret (Plaid keys, aggregator tokens, push sends) or must not be trusted to the client runs in an Edge Function.

## 3. Monorepo layout (Turborepo + pnpm)

```
apps/
  web/              Next.js (App Router), @supabase/ssr, shadcn/ui
  mobile/           Expo (expo-router), NativeWind, RN Paper
packages/
  core/             money math, currency formatting, budget/recurring logic (pure TS, unit-tested)
  schemas/          Zod schemas + Supabase-generated DB types
  data/             supabase client factory + TanStack Query hooks (shared by web & mobile)
  config/           tsconfig, eslint, shared Tailwind preset (used by Tailwind and NativeWind)
supabase/
  migrations/       SQL migrations (source of truth for schema + RLS)
  functions/        Edge Functions
  seed.sql
```

UI components are **not** shared across platforms (shadcn is web-only, RN Paper is native-only). What is shared: types, validation, business logic, data hooks and design tokens.

## 4. Region strategy: USA + India

| Concern | USA | India |
|---|---|---|
| Currency / format | USD, `Intl.NumberFormat('en-US')` | INR, `Intl.NumberFormat('en-IN')` (lakh/crore grouping) |
| Bank & card sync | **Plaid** (Transactions, Balances, Liabilities, Investments) | **Phase 1:** bank statement import (CSV/XLS/PDF), manual entry. **Later:** Account Aggregator via a TSP (Setu / Finvu / OneMoney)* |
| Investments | Plaid Investments; market price API | **CAS import** (CAMS/KFintech consolidated statement PDF) for mutual funds; daily **AMFI NAV** feed; NSE/BSE prices via market API |
| Retirement / tax-advantaged | 401(k), IRA, Roth IRA, HSA | EPF, PPF, NPS, ELSS (80C) |
| Payments context | Cards, ACH, Zelle | UPI-heavy — merchant names need normalisation (`UPI/…/merchant@bank`) |
| Phone auth | Optional | Phone OTP is expected (Supabase Auth phone provider + SMS vendor e.g. Twilio/MSG91) |
| Privacy law | State laws (e.g. CCPA/CPRA), GLBA if applicable | **DPDP Act 2023** — explicit consent, purpose limitation, deletion on request |

\* **India bank-sync constraint:** under RBI's Account Aggregator framework, only regulated entities (RBI/SEBI/IRDAI/PFRDA) can be a Financial Information User. A personal app cannot pull bank data via AA on its own; you need a regulated partner or licence. Hence statement/CAS import first. Android SMS-reading is not a viable alternative — Google Play restricts the SMS permission.

**Data residency:** one Supabase project is enough to start. Choose the region by where most users are (`ap-south-1` Mumbai or `us-east-1`). DPDP allows transfers abroad except to countries the government blacklists. Split into per-region projects only if a partner or regulator requires it.

**User model:** every user has a `home_country` (`US`/`IN`) and `base_currency`. All account types and providers are tagged by country, so the UI shows only relevant options.

## 5. Data model (core tables)

All amounts are stored as **`bigint` minor units** (cents / paise) plus an ISO-4217 `currency`. Never use floats.

```
profiles            id (= auth.users.id), home_country, base_currency, locale, timezone
institutions        id, country, name, provider (plaid | manual | statement | aa)
connections         id, user_id, provider, institution_id, status, vault_secret_id, last_synced_at
accounts            id, user_id, connection_id?, type (checking|savings|credit|loan|investment|cash|wallet),
                    name, currency, current_balance, is_archived
transactions        id, user_id, account_id, posted_at, amount, currency, description, merchant,
                    category_id, source (sync|import|manual), external_id, is_transfer, notes
                    UNIQUE (account_id, external_id)  -- dedupes re-syncs and re-imports
transaction_splits  id, transaction_id, category_id, amount
categories          id, user_id (null = system default), name, parent_id, kind (income|expense|transfer)
category_rules      id, user_id, match (merchant/description pattern), category_id
budgets             id, user_id, month, currency
budget_lines        id, budget_id, category_id, amount, rollover
recurring_items     id, user_id, name, amount, currency, cadence, next_due_on, account_id?, remind_days_before
goals               id, user_id, name, target_amount, currency, target_date, linked_account_id?
holdings            id, account_id, security_id, quantity, cost_basis
securities          id, symbol, isin, name, type (stock|etf|mutual_fund|bond), country
prices              security_id, date, close
fx_rates            date, base, quote, rate
attachments         id, user_id, transaction_id?, storage_path, kind (receipt|statement|cas)
push_tokens         id, user_id, expo_push_token, platform
notifications_log   id, user_id, kind, ref_id, sent_at   -- idempotency for reminders
```

Reports (cash flow, category spend, net-worth trend) are SQL views or RPC functions converted to `base_currency` using `fx_rates`.

## 6. Security

- **RLS on every user table:** `using (user_id = auth.uid())`. Reference tables (`securities`, `prices`, `fx_rates`) are read-only to clients. CI runs a check that no table in `public` has RLS disabled.
- **Secrets stay server-side.** Plaid keys, the `service_role` key and AA credentials exist only in Edge Function env vars. Plaid `access_token`s are stored in **Supabase Vault**; the `connections` row holds only the secret ID.
- **Webhooks** (Plaid) verify signatures in the Edge Function before writing.
- **Storage:** private buckets with policies keyed on `auth.uid()` in the object path (`{user_id}/…`). Clients use signed URLs only.
- **Auth:** MFA (TOTP) available; mobile sessions in `expo-secure-store`; biometric app lock via `expo-local-authentication`.
- **User rights:** data export (JSON/CSV) and account deletion, which cascades rows, Storage objects and Plaid `/item/remove`. Required for DPDP and good practice for CCPA.
- **Sentry:** scrub amounts, account numbers and descriptions in `beforeSend`. Send no financial payloads.

## 7. Key flows

**US bank linking (Plaid)**
1. Client calls the `plaid-link-token` Edge Function, which returns a `link_token`.
2. Plaid Link (web SDK / `react-native-plaid-link-sdk`) returns a `public_token`.
3. The `plaid-exchange` function swaps it for an `access_token`, stores it in Vault and creates the `connection` and `accounts` rows.
4. A Plaid `SYNC_UPDATES_AVAILABLE` webhook triggers `plaid-sync`, which calls `/transactions/sync` with a cursor and upserts on `(account_id, external_id)`.

**India statement / CAS import**
1. The user uploads a file to Storage `{user_id}/imports/…`.
2. The `import-statement` function picks a parser for the bank or CAS format, normalises UPI narrations, auto-categorises, and upserts with a hash-based `external_id`.
3. The client shows a review screen before committing low-confidence rows.

**Reminders (scheduled Edge Functions)**
- `pg_cron` calls the `reminders` function via `pg_net` hourly. It finds `recurring_items` due within `remind_days_before` in the user's timezone, sends Expo push in batches, and writes `notifications_log` so nothing sends twice.
- Other daily jobs: `refresh-prices` (AMFI NAV, market API), `refresh-fx`, `detect-recurring`.
- Move to a real queue only when jobs exceed Edge Function time limits.

## 8. Decisions and recommendations

- **Prisma: skip it for app data access.** Prisma connects as a privileged Postgres role and bypasses RLS, so you would have to re-implement authorisation by hand. Use supabase-js with generated types (`supabase gen types typescript`), and keep SQL migrations in `supabase/migrations`. If Prisma is ever added, limit it to admin or scripts.
- **Mobile UI:** use NativeWind for layout and styling, and React Native Paper only for complex widgets (dialogs, menus, date pickers). Map Paper's theme to the shared Tailwind tokens so there is one source of colour.
- **Charts:** both Recharts and Victory Native read the same series shape, produced by RPCs and typed in `@velora/schemas`.
- **Offline (mobile):** TanStack Query persisted cache plus optimistic mutations for manual entries. Defer a full offline database until it is needed.
- **Netlify:** deploy Next.js with the Netlify Next.js runtime; use `@supabase/ssr` for cookie-based sessions and middleware auth.

## 9. CI/CD (GitHub Actions)

- **PR:** `pnpm install` → `turbo run lint typecheck test` (affected packages only) → `supabase db lint` plus migrations applied against a local Supabase in CI → RLS check.
- **Main:** Netlify deploys web automatically; `supabase db push` and `supabase functions deploy` for production; EAS Update (OTA) for JS-only mobile changes, and an EAS Build plus store submission for native changes.
- **Environments:** `dev` (local Supabase via CLI), `staging` and `prod` Supabase projects, Plaid Sandbox → Development → Production.

## 10. Roadmap

1. **MVP:** auth (email, Google, Apple, phone OTP), profiles with country/currency, manual accounts and transactions, CSV import, categories and rules, monthly budgets, dashboard (web and mobile), RLS, Sentry.
2. **Sync and reminders:** Plaid (US), India statement parsers (top banks), recurring detection, bill reminders through Expo push, receipt upload.
3. **Wealth:** goals, debts/EMIs, holdings, CAS import, AMFI NAV and market prices, net-worth history, FX.
4. **Later:** India AA via a regulated partner, tax views (US/IN), insights and Q&A over own data, shared/household budgets, web push or email reminders.
