# Going live

Order matters: **Supabase first** (the web and mobile apps need its URL and key), then **web**, then **mobile**.
Everything below is a one-time setup; after it, a push to `main` redeploys the web app automatically.

## What you need (accounts and costs)

| Service | For | Cost |
|---|---|---|
| [Supabase](https://supabase.com) | database, login, reminders | Free tier works for testing but pauses after a week without activity — use **Pro (~$25/mo)** for real users |
| [Netlify](https://netlify.com) | web hosting | Free tier is fine to start |
| [Expo](https://expo.dev) (EAS) | building the mobile apps | Free tier (limited build queue) |
| Apple Developer Program | App Store + TestFlight | $99 / year |
| Google Play Console | Play Store | $25 one-time |
| [Sentry](https://sentry.io) (optional) | error tracking | Free tier |

You also need Node 22 and pnpm 10 on your computer (`corepack enable` installs pnpm).

## Free-tier plan ($0)

The chosen launch path. It changes four things from the full plan below:

| Area | On the free tier | What to do |
|---|---|---|
| **Web app** | Fully live: Supabase Free + Netlify Free | Follow sections 1 and 2 as written |
| **iPhone users** | No App Store or TestFlight (both need the $99 Apple account); iOS push reminders also need it | iPhone users use the web app in Safari and can tap Share → Add to Home Screen |
| **Android users** | No Play Store ($25), but the app can be installed directly | Follow section 3 steps 1–5 with the **preview** profile, Android only: `eas build --profile preview --platform android`, then share the install link EAS gives you. Push reminders work (Firebase is free). Users must allow "install unknown apps". |
| **Sign-up emails** | Supabase's built-in email only sends to your own team's addresses, so strangers can't receive confirmation or password-reset emails | Connect a free SMTP sender in Supabase → Authentication → Emails → SMTP. **Brevo** (300 emails/day) can send from a verified personal address without owning a domain; **Resend** (3,000/month) needs a domain you own. Only as a last resort, turn **Confirm email** off — sign-up then works without email, but password reset still needs SMTP. |
| **Database pausing** | A free Supabase project pauses after about a week with no activity; while paused, the app and the hourly reminders stop | Open the app (or the Supabase dashboard) at least weekly, and click **Restore** in the dashboard if it pauses. Data is kept while paused. |

Free-tier limits worth knowing:

| Service | Free limit |
|---|---|
| Supabase | 500 MB database, 50,000 monthly active users, 2 active projects, no automatic backups |
| Netlify | 300 build minutes and 100 GB bandwidth per month |
| Expo EAS | about 30 builds per month, slower build queue |
| GitHub Actions | free for public repos; 2,000 minutes/month for private ones |
| Sentry | 5,000 errors per month |

Because the free tier has **no backups**, export your data now and then: Supabase dashboard → Database → Backups is Pro-only, so use `npx supabase db dump --data-only > backup.sql` from your computer.

Upgrade path: when you have regular users, move Supabase to Pro first (no pausing, daily backups), then add the Apple and Google accounts to publish to the stores (section 3 step 6 and section 4).

---

## 1. Supabase (backend)

1. **Create a project** at supabase.com → New project. Pick the region closest to most users: **Mumbai (ap-south-1)** for India-first, **US East** for US-first. Save the database password.
2. **Copy the keys:** Project Settings → API Keys → note the **Project URL** and the **Publishable key**. (Never put the *secret* / service-role key in the apps.)
3. **Push the database** from your computer, in the repo folder:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   This creates every table, the security rules, the reports and the hourly reminder schedule.
4. **Create the two secrets the reminder schedule reads** — Supabase dashboard → SQL Editor, run (pick any long random string for the secret):
   ```sql
   select vault.create_secret('https://<your-project-ref>.supabase.co', 'project_url');
   select vault.create_secret('<long-random-string>', 'cron_secret');
   ```
5. **Deploy the reminders function** with the same secret:
   ```bash
   npx supabase secrets set CRON_SECRET=<same-long-random-string>
   npx supabase functions deploy reminders --no-verify-jwt
   ```
6. **Auth settings** (Authentication → URL Configuration):
   - Site URL: your web address (e.g. `https://velora.netlify.app`, later your own domain).
   - Redirect URLs: add `https://<your-site>/auth/callback` and `velora://**`.
   - Authentication → Providers → Email: keep **Confirm email** on.
   - Authentication → Emails → SMTP: connect a real email provider (e.g. Resend, Postmark, SES). Supabase's built-in sender is rate-limited and meant only for testing.
7. **Check it:** after the next hour, run `select * from cron.job_run_details order by start_time desc limit 5;` — status should be `succeeded`.

## 2. Web app (Netlify)

1. Netlify → Add new site → Import from GitHub → pick `velora-finance`.
2. Build settings:
   - **Base directory:** leave empty (repo root).
   - **Package directory:** `apps/web` (Netlify reads `apps/web/netlify.toml` for the build command).
3. Environment variables (Site configuration → Environment variables):
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL from step 1.2
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = Publishable key
   - `NEXT_PUBLIC_SENTRY_DSN` = optional
4. Deploy. Netlify picks the branch to deploy from — choose `main` after you merge the PR.
5. **Custom domain** (optional): Domain management → add your domain, then update the Supabase Site URL and redirect URL (step 1.6) to it.
6. **Smoke test:** sign up → confirm the email → add an account → add a transaction → import a CSV → check Wealth and Flow.

## 3. Mobile apps (Expo EAS)

1. Install the tool and sign in:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Link the app (writes the project id push notifications need into `app.json` — commit that change):
   ```bash
   cd apps/mobile
   eas init
   ```
3. Set the environment variables for builds:
   ```bash
   eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value <Project URL> --environment preview --environment production --visibility plaintext
   eas env:create --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value <Publishable key> --environment preview --environment production --visibility plaintext
   ```
4. **Test build first** (installs directly on your own phones):
   ```bash
   eas build --profile preview --platform all
   ```
   iOS asks for your Apple Developer login and registers your test devices; Android gives you an installable file.
5. **Push notifications:**
   - iOS: EAS creates the Apple push key for you during the build — accept when asked.
   - Android: create a Firebase project, add an Android app with package `com.velora.finance`, download a service-account key, and upload it with `eas credentials` (Android → Push Notifications: FCM V1).
   - Then on a phone: Bills tab → **Turn on reminders**.
6. **Store release:**
   ```bash
   eas build --profile production --platform all
   eas submit --platform ios
   eas submit --platform android
   ```
   Then finish the listings in App Store Connect and Google Play Console.

## 4. Before you submit to the stores

These are required or strongly expected for a finance app:

- **App icon and splash screen** — still Expo's defaults (`apps/mobile/assets/images/`). Replace with Velora artwork.
- **Privacy policy URL** — required by both stores; must cover what you store (email, financial entries) and how users delete data. India's DPDP Act and US state laws (e.g. CCPA) apply.
- **Account deletion** — Apple and Google require an in-app way to delete the account. Not built yet; add before submitting.
- **Store data-safety forms** — declare: email, financial info (user-entered), no tracking, no data sold.
- **Finance category review** — Apple may ask you to confirm the app gives no financial advice and doesn't move money.

## 5. After launch

- **Updates:** merge to `main` → Netlify redeploys web. For mobile, JavaScript-only changes can ship instantly with `eas update --channel production`; native changes need a new `eas build` + store review.
- **Database changes:** add a new file in `supabase/migrations/`, then `npx supabase db push` (and `pnpm db:types` to refresh types).
- **Monitoring:** Sentry for app errors; Supabase → Logs for API, auth and function logs.
- **Backups:** Supabase Pro includes daily backups; consider Point-in-Time Recovery once you have real users.
