# How Velora works (as built)

This document describes the system **as it exists in the code today**. The longer-term target (bank sync, investments, FX, Storage) lives in [`ARCHITECTURE.md`](ARCHITECTURE.md); the visual system in [`design/DESIGN.md`](design/DESIGN.md).

## 1. The big picture

Velora is three things that share one brain:

```mermaid
flowchart LR
  subgraph Clients
    W["Web app<br/>Next.js 16 · Netlify"]
    M["Mobile app<br/>Expo SDK 58 · iOS / Android"]
  end
  subgraph Shared["Shared TypeScript packages"]
    C["@velora/core<br/>money · CSV import · budget maths"]
    S["@velora/schemas<br/>Zod validation · DB types"]
    D["@velora/data<br/>TanStack Query hooks"]
    T["@velora/config<br/>Pearl design tokens"]
  end
  subgraph Supabase
    A["Auth<br/>email + password"]
    R["PostgREST API"]
    P[("Postgres<br/>RLS on every table")]
    E["Edge Function<br/>reminders"]
    J["pg_cron · hourly"]
  end
  X["Expo Push service"]
  W --> D
  M --> D
  D --> S --> C
  W -.tokens.-> T
  M -.tokens.-> T
  D -- "HTTPS + user JWT" --> R --> P
  W & M -- sign in --> A
  J --> E --> P
  E --> X --> M
```

- **No custom API server.** Both apps talk to Supabase directly with the signed-in user's token. Postgres **Row Level Security (RLS)** is what stops one user reading another's data — not the app code.
- **Business logic lives once**, in the shared packages, and both apps import it.
- **The only server-side code** is one scheduled Edge Function (bill reminders), because it needs the admin key and must run without a user present.

## 2. Repository map

```
apps/web/                      Next.js web app
  src/proxy.ts                   session refresh + sign-in redirect (Next 16's "middleware")
  src/app/(auth)/                /login, /signup
  src/app/auth/callback/         email-confirmation landing (code → session cookie)
  src/app/(app)/                 /, /flow, /activity, /budgets, /goals, /bills, /accounts
  src/components/                charts, orb, rings, nav, shadcn-style ui/
apps/mobile/                   Expo app
  src/app/_layout.tsx            fonts, session, auth guard, providers
  src/app/sign-in|sign-up.tsx    auth screens
  src/app/(tabs)/                Home, Budgets, Goals, Bills (+ floating Dock)
  src/app/add.tsx                quick-add keypad sheet
  src/app/account-new.tsx        new-account sheet
  src/lib/supabase.ts            client with Keychain/Keystore session storage
  src/lib/push.ts                push permission, token registration, sign-out unlink
packages/config|core|schemas|data
supabase/
  migrations/                    schema, RLS, reports, cron
  functions/reminders/           hourly push reminders
  tests/                         RLS + report tests (run in CI on plain Postgres)
.github/workflows/ci.yml       typecheck, lint, tests, web build, mobile bundle, DB tests
```

## 3. Money: one rule everywhere

Every amount is an **integer number of minor units** (cents or paise) plus a currency code — never a decimal float.

| Step | Where | Example |
|---|---|---|
| User types `1,250.50` | form field | text |
| Parse | `parseToMinor` (`@velora/core`) | `125050` |
| Validate | `amountInput` (`@velora/schemas`) | must be > 0 |
| Store | `transactions.amount bigint` | `-125050` (spend is negative) |
| Display | `formatMoney(…, 'INR')` | `-₹1,250` (en-IN lakh grouping) |

- **Sign convention:** money out is negative, money in positive. Credit-card and loan opening balances are stored negative (you owe them).
- **Formats:** `en-US` for USD (`$284,512.60`), `en-IN` for INR (`₹24,85,300`); compact forms `₹14.2 L`, `₹2.5 Cr`, `$1.2M`.

## 4. Sign-in and sessions

```mermaid
sequenceDiagram
  actor U as User
  participant App as Web / Mobile
  participant Auth as Supabase Auth
  participant DB as Postgres
  U->>App: Sign up (name, country US/IN, email, password)
  App->>Auth: signUp(..., metadata: display_name, home_country)
  Auth->>DB: insert auth.users
  DB->>DB: trigger handle_new_user → profiles row<br/>(IN → INR + Asia/Kolkata, US → USD + New York)
  Auth-->>App: session (JWT + refresh token)
  Note over App: every request now carries the JWT,<br/>and Postgres reads auth.uid() from it
```

- **Web:** the session lives in cookies (`@supabase/ssr`). `src/proxy.ts` runs before every page, refreshes the cookie and verifies the JWT with `getClaims()`; signed-out visitors go to `/login`, signed-in users skip `/login`.
- **Mobile:** the session is stored in the iOS Keychain / Android Keystore via `expo-secure-store`. Sessions exceed the store's ~2 KB limit, so `lib/supabase.ts` splits them into chunks. Token refresh only runs while the app is in the foreground. The root layout uses `Stack.Protected`: signed out → sign-in screen; signed in → tabs.
- **Email confirmation** (when enabled in Supabase) returns to `/auth/callback` on web, or `velora://` on mobile.
- **Signing out** clears the TanStack Query cache (no previous user's data on screen) and, on mobile, first removes the device's push token.

## 5. How data moves (read and write)

Both apps wrap themselves in `VeloraDataProvider` (gives the hooks a Supabase client) and a TanStack Query client (caching, 30-second freshness, one retry).

```mermaid
sequenceDiagram
  participant Screen
  participant Hook as @velora/data hook
  participant Cache as TanStack Query
  participant API as Supabase (PostgREST)
  participant DB as Postgres + RLS
  Screen->>Hook: useAccounts()
  Hook->>Cache: cached? fresh?
  Cache->>API: GET account_balances (JWT)
  API->>DB: SELECT … (RLS: user_id = auth.uid())
  DB-->>Screen: only this user's rows
  Screen->>Hook: useAddTransaction().mutate(form)
  Hook->>Hook: Zod validation (same rules as the form)
  Hook->>API: INSERT transactions
  API->>DB: RLS WITH CHECK + same-owner FK
  Hook->>Cache: invalidate accounts, transactions, summary, budget, net-worth
  Cache-->>Screen: refetch → UI updates everywhere
```

| Hook | Reads / writes | Used by |
|---|---|---|
| `useProfile`, `useCurrency` | `profiles` | both |
| `useAccounts`, `useAddAccount` | `account_balances` view, `accounts` | both |
| `useTransactions`, `useAddTransaction`, `useDeleteTransaction` | `transactions` (+ category, account) | both / web |
| `useImportTransactions` | upsert `transactions` | web |
| `useMonthSummary` | RPC `month_summary` | both |
| `useBudget`, `useSetBudgetLine` | RPC `budget_progress`, `budget_lines` | both / web |
| `useNetWorth` | RPC `net_worth_history` | both |
| `useGoals`, `useAddGoal`, `useContribute` | `goals`, RPC `contribute_to_goal` | both / web |
| `useBills`, `useAddBill`, `useMarkBillPaid` | `recurring_items`, RPC `mark_bill_paid` | both / web |
| `useSavePushToken` | `push_tokens` | mobile |

Any write that can move money refreshes every money-related query, so balances, budgets, charts and summaries never disagree.

## 6. The database

**Tables** (all with `user_id`, all RLS-protected):

| Table | Holds | Notable rules |
|---|---|---|
| `profiles` | name, home country, base currency, timezone | created by sign-up trigger; read/update own only |
| `accounts` | bank/card/cash/investment accounts, opening balance | last-4 `mask` must be digits |
| `categories` | 13 built-in (shared, read-only) + user's own | built-ins can't be edited |
| `transactions` | signed amount, date, description, merchant, category, source | `(account_id, user_id)` FK = can only post to your own account; `UNIQUE(account_id, external_id)` = no duplicate imports; category must be visible to you |
| `budget_lines` | monthly limit per category | one per (user, month, category) |
| `goals` | target, saved so far, date | |
| `recurring_items` | bills: amount, cadence, next due, reminder days, autopay | |
| `push_tokens` | device push tokens | |
| `notifications_log` | which reminders were sent | no client access at all |

**Reports** run inside Postgres with `security invoker`, so RLS still applies:

- `account_balances` (view) — opening balance + sum of transactions.
- `month_summary(month)` — totals per category for a month.
- `budget_progress(month)` — budgeted vs spent per category.
- `net_worth_history(months)` — net worth at each month end.
- `contribute_to_goal(goal, amount)` and `mark_bill_paid(bill)` — atomic updates, so two taps can't lose an update.

> Reports currently count only accounts in the user's base currency. Mixed USD + INR needs the FX step in the target architecture.

## 7. Feature by feature

**Accounts.** Added with today's balance (web: Accounts page; mobile: "+ Add" on Home). Balances are always computed, never stored, so they can't drift.

**Transactions.** Added from the web dialog or the mobile keypad sheet (gold "+" in the dock). Expense/income toggle decides the sign.

**CSV statement import (web).**
1. Read the file in the browser; `parseCsv` handles quotes and Windows line endings.
2. `importStatement` finds the columns by name — `Date`, `Description/Narration/Particulars`, and either one signed `Amount` or `Debit/Withdrawal` + `Credit/Deposit` (the Indian bank layout).
3. Dates are read day-first for Indian users, month-first for US users.
4. Each row gets a stable fingerprint (`external_id`) from date + description + amount; two identical rows on one day get `_2`, `_3`.
5. `merchantFromNarration` turns `UPI/…/SWIGGY/swiggy@icici` into `Swiggy`.
6. Upsert with "ignore duplicates" → re-importing the same statement adds nothing; the dialog reports inserted vs already-existing rows.

**Budgets.** Monthly limit per category; progress turns gold at 85% and red when over.

**Safe to spend today** = (budget left this month − manual bills still due this month) ÷ days left including today, never below zero.

**Goals.** Contributions go through `contribute_to_goal`; the liquid-gold orb fills to the saved percentage.

**Bills and reminders.**

```mermaid
sequenceDiagram
  participant Cron as pg_cron (hourly, :07)
  participant Fn as reminders Edge Function
  participant DB as Postgres
  participant Expo as Expo Push
  participant Phone
  Cron->>Fn: POST + x-cron-secret
  Fn->>DB: bills due within their reminder window
  loop each due bill
    Fn->>DB: claim (bill, due date) in notifications_log
    Note over Fn,DB: already claimed → skip (never double-send)
    Fn->>Expo: push to the owner's devices
    Expo-->>Phone: "Rent due tomorrow · ₹1,88,000"
    Fn->>DB: delete tokens Expo reports as uninstalled
  end
  Fn->>DB: autopay bills past due → roll to next cycle
```

A phone receives reminders after the user taps **Turn on reminders** on the Bills tab (permission prompt → Expo token → `push_tokens`). If sending fails, the claim is released so the next hourly run retries.

**Bills vs. Subscriptions.** Both live in `recurring_items` and share reminders, autopay roll-forward and **Mark paid / Mark renewed**. A `kind` column (`bill` | `subscription`) splits them into two tabs. Bills are rent, card dues, utilities and loans. Subscriptions add an optional `website`, which shows the company logo. Popular brands (Netflix, Spotify, YouTube, iCloud, Apple, Notion, Swiggy, Zomato and others) use official marks bundled from Simple Icons. Others use the site's own icon via Google's favicon service, with a letter tile as the last fallback, plus monthly and yearly totals (`monthlyCost`: weekly × 52 ÷ 12, yearly ÷ 12). Neither records a transaction. They are what's *coming*, and they feed **Safe to spend** and **Next up**. Removing a subscription only stops tracking it; it doesn't cancel it with the provider.

**Deleting things.** Every delete (transaction, bill, subscription, goal, bank account, your whole account) opens a styled confirm popup (`ConfirmDialog`), not the browser's `confirm()`. Deleting a bank account also deletes its transactions (database cascade). **Delete my account** asks you to type `DELETE`, then calls `delete_my_account()`. That function removes your auth user, and every table cascades from it.

**Accounts & settings (`/accounts`).** Profile (name, country/currency), bank accounts, sign-in & security (change email with a confirmation link, change password, connected sign-in methods), preferences, help/FAQ, sign out, and delete account.

**Passwords.** Every password field has a show/hide eye. Sign-up and change-password add **Suggest strong password** (16 characters from the browser's secure random generator, every character class, no look-alike characters) and a strength meter.

**Social sign-in.** Buttons from `NEXT_PUBLIC_AUTH_PROVIDERS` call `signInWithOAuth`. The provider sends the user back through Supabase to `/auth/callback`, which swaps the code for a session cookie, the same way email links work. New users get their name from the provider profile.

**Import (web).** Accepts Excel `.xlsx` (first sheet), CSV, TSV and semicolon-separated files. It finds the header row even below a bank's preamble and skips footer rows like "Closing balance". It understands a signed `Amount`, `Amount` + `Dr/Cr`, or separate `Withdrawal`/`Deposit` columns. It detects ₹/INR/Rs vs $/USD and only imports into an account of the matching currency (you can override the currency). Before anything is saved you review every row: untick rows, rename them, and change the guessed category.

**Subscriptions in depth.** Each subscription can have a category (Streaming, Music, Cloud, Software, AI tools…), a description, the billing email it's under, an uploaded logo, an auto-renew status and a reminders switch. The page groups subscriptions by category with subtotals, filters by category or status (renewing this week, overdue, auto-renew off, reminders off), shows a spending-by-category overview, and lists the next 30 days of renewals with **See all**. Uploaded logos are redrawn in the browser to a 128×128 WebP, so only plain pixels are stored, and the database rejects anything that isn't PNG, JPG or WebP.

**Reminders.** The hourly function sends phone pushes `remind_days_before` days ahead. For subscriptions it also sends an email at least 7 days ahead (when Brevo is configured). Push and email are logged separately in `notifications_log`, so neither is ever sent twice. The 🔔 in the top bar lists everything overdue or due within 7 days.

**Sessions.** Sign-in uses Supabase's secure cookies. On top of that, `SessionGuard` signs you out after 30 minutes without activity, with a 2-minute "Still there?" warning; activity in any tab counts. With **Remember me** the limit is 30 days. Without it you're also signed out when the browser closes. **Forgot password?** emails a one-time link to `/reset-password`. Saving a new password signs out every device.

**Security headers.** Every page is sent with a Content-Security-Policy (only this site, Supabase, and Google favicons for logos), HSTS, `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and a Permissions-Policy that blocks the camera, microphone and location. A cookie notice explains that only essential cookies are used.

**Footer and legal pages.** Signed-in pages end with a footer: brand, product, account and legal links, the support email, and ©. Sign-in pages show a compact version. `/privacy` and `/terms` are public. Review their wording before launch.

**Insights ("Velora noticed", web Flow page).** Simple rules over your own data: budgets near or over limit, the category leading your spending, bills due within three days.

## 8. How the screens are built

**Web.** Pages are client components inside a Suspense boundary: the page shell is pre-built at deploy time and the data loads in the browser through the shared hooks. Components follow shadcn/ui conventions (`components/ui`, `cva`, Radix primitives). Charts: Recharts (net worth area, cash-flow Sankey).

**Mobile.** Expo Router screens styled with NativeWind (Tailwind classes). Navigation is a custom floating **Dock**: a glass pill whose active tab expands with its label, plus a gold quick-add button. Glass surfaces use Apple's Liquid Glass on iOS 26+, blur on older iPhones and a solid frosted fill on Android. Chart: Victory Native (Skia). Animations: Reanimated, respecting the OS "reduce motion" setting.

**Design tokens and dark mode.** `packages/config/src/tokens.json` holds two colour sets: Pearl (light) and Noir (dark). Web emits both as CSS variables, with Noir inside a `prefers-color-scheme: dark` media query, so the browser switches with no flash. Mobile sets the same variables at the app root with NativeWind's `vars()`, picking the set from the phone's appearance (`userInterfaceStyle: automatic`); a `useTheme()` hook supplies colours to the few places classes can't reach (blur tint, SVG strokes, placeholders).

## 9. Security model in one list

- RLS on every table; tested in CI (cross-user reads and writes, spoofed `user_id`, foreign categories, duplicate imports, anonymous access).
- Clients only ever hold the **publishable** key; the service-role key exists only inside the Edge Function.
- The reminders endpoint rejects calls without the cron secret.
- Web routing decisions use a **verified** JWT (`getClaims`), never an unverified cookie.
- Mobile sessions are in the Keychain / Keystore, not plain storage.
- Validation runs at every trust boundary: forms (Zod), hooks (Zod again before sending), and database constraints (lengths, signs, formats).
- Sentry is only initialised when a DSN is configured.

## 10. How it's verified

| Check | What it proves | Where |
|---|---|---|
| `pnpm test` (17 tests) | money parsing/formatting, CSV import, merchants, budgets, form validation | `packages/*/src/*.test.ts` |
| `supabase/tests/rls.test.sql` | isolation between users, reports' numbers | CI `database` job |
| `pnpm typecheck` / `pnpm lint` | all 6 workspace projects | CI |
| `next build` | web compiles and prerenders | CI |
| `expo export` (iOS + Android) | mobile bundles with every native module | CI |

## 11. Configuration

| Variable | App | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | web | API endpoint + public key |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | mobile | same |
| `NEXT_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_DSN` | both | optional error tracking |
| `NEXT_PUBLIC_AUTH_PROVIDERS` | web | social sign-in buttons, e.g. `google,github` (default `google`) |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | web | optional "Contact support" button |
| `CRON_SECRET`, `EXPO_ACCESS_TOKEN` | reminders function | cron auth; optional Expo push auth |
| Vault: `project_url`, `cron_secret` | database | used by the hourly cron call |

Setup and deploy steps: [`README.md`](../README.md).

## 12. Built vs. planned

| Area | Today | Target (see ARCHITECTURE.md) |
|---|---|---|
| Bank data | manual entry + CSV import | Plaid (US); Account Aggregator via a regulated partner (India) |
| Currencies | one base currency per user | FX conversion across USD/INR accounts |
| Investments | investment accounts as balances | holdings, prices, CAS import for Indian mutual funds |
| Sign-in | email + password; Google/GitHub/Microsoft on web | social sign-in on mobile, phone OTP (India), MFA |
| Files | — | receipts and statements in Supabase Storage |
| Mobile editing | add transactions/accounts, contribute to goals | also create budgets, goals, bills |
| Account management | add, delete; edit profile; change email/password; delete account (web) | edit/archive accounts; data export; same on mobile |
| Subscriptions | separate web tab with logos and totals | mobile tab |
