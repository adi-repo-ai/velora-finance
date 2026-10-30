# Velora

Personal all-in-one finance app for the **USA** and **India** — web (Next.js) and mobile (Expo), sharing one Supabase backend and the Pearl design system.

- How it works (as built): [`docs/HOW-IT-WORKS.md`](docs/HOW-IT-WORKS.md)
- Target architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Design system: [`docs/design/DESIGN.md`](docs/design/DESIGN.md)

```
apps/web          Next.js 16 · Tailwind 4 · shadcn-style components · Recharts   → Netlify
apps/mobile       Expo SDK 58 · Expo Router · NativeWind · glass Dock · Victory Native → EAS
packages/config   Pearl design tokens (tokens.json → CSS vars + NativeWind)
packages/core     Money (minor units, en-US / en-IN), CSV statement import, budget maths
packages/schemas  Zod schemas + Supabase database types
packages/data     Supabase queries as TanStack Query hooks (shared by web + mobile)
supabase/         Migrations (RLS on every table), reporting RPCs, reminders Edge Function, tests
```

## What works today

Sign up (choose US/USD or India/INR) · accounts with opening balances · manual transactions · CSV statement import (US signed-amount and Indian debit/credit formats, de-duplicated on re-import) · monthly category budgets · goals with contributions · bills with push reminders (mobile) · net-worth history, cash-flow Sankey, spend heat-map and rule-based insights.

Not yet: bank sync (Plaid for the US; India needs a regulated Account Aggregator partner), investments/holdings, FX between USD and INR accounts, editing/deleting accounts, setting budgets/goals/bills from mobile.

## Run locally

Prerequisites: Node 22, pnpm 10, Docker (for local Supabase).

```bash
pnpm install
```

```bash
npx supabase start
```

`supabase start` applies the migrations and prints an API URL and a publishable key. Put them in `apps/web/.env.local` and `apps/mobile/.env` (see `.env.example`), then:

```bash
pnpm --filter @velora/web dev
```

```bash
pnpm --filter @velora/mobile start
```

Local email confirmation is off, so you can sign up and use the app immediately.

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Database/RLS tests run against plain Postgres in CI (`.github/workflows/ci.yml`, using `supabase/tests/`).

## Deploy

- Step-by-step launch guide: [`docs/GO-LIVE.md`](docs/GO-LIVE.md).
- **Web → Netlify:** set Package directory to `apps/web`; `apps/web/netlify.toml` builds from the monorepo root. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and optionally `NEXT_PUBLIC_SENTRY_DSN`.
- **Mobile → EAS:** run `eas init` once (adds the project id push notifications need), then `eas build --profile preview`. Set the `EXPO_PUBLIC_*` variables as EAS environment variables.
- **Supabase:** `supabase link` then `supabase db push` and `supabase functions deploy reminders`. For hourly reminders, create the two Vault secrets and `CRON_SECRET` described in `supabase/migrations/20261030000100_reminders_cron.sql`; optionally set `EXPO_ACCESS_TOKEN`. Add your site URL and `velora://**` to Auth redirect URLs.
- After schema changes, regenerate types with `pnpm db:types`.
