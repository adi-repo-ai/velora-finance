import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy · Velora" };

export default function PrivacyPage() {
  const support = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  return (
    <article>
      <p className="label-mono">Legal</p>
      <h1 className="mt-2 font-serif text-6xl leading-none">Privacy <em className="text-gold-2">policy.</em></h1>
      <p>Last updated 1 November 2026. This policy explains what Velora collects, why, and the choices you have.</p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Account details:</b> your name, email, country and, if you use it, the profile your Google, GitHub or Microsoft account shares at sign-in.</li>
        <li><b>Money data you add:</b> accounts and balances, transactions (typed or imported from CSV), budgets, goals, bills and subscriptions.</li>
        <li><b>Device data for reminders:</b> a push-notification token if you turn reminders on in the mobile app.</li>
      </ul>
      <p>We never ask for or store your bank passwords, and Velora cannot move money.</p>

      <h2>How we use it</h2>
      <ul>
        <li>To show your dashboards, reports and insights, which are calculated only from your own data.</li>
        <li>To send the emails you need (confirmation, password reset) and the bill reminders you turn on.</li>
        <li>To keep the service secure and fix errors.</li>
      </ul>
      <p>We don’t sell your data, and we don’t use it for advertising.</p>

      <h2>Who processes it for us</h2>
      <ul>
        <li><b>Supabase:</b> database and sign-in. Every table is protected so each account can only read its own rows.</li>
        <li><b>Netlify:</b> hosts this website.</li>
        <li><b>Brevo:</b> delivers account emails.</li>
        <li><b>Expo:</b> delivers push notifications to your phone.</li>
        <li><b>Google:</b> provides some subscription logos. Only the service’s website (for example <i>netflix.com</i>) is requested, never your amounts. Google also handles sign-in if you choose “Continue with Google”.</li>
        <li><b>Sentry</b> (if enabled): error reports that help us fix crashes.</li>
      </ul>

      <h2>Cookies</h2>
      <p>We use only the cookies needed to keep you signed in. There are no advertising or tracking cookies.</p>

      <h2>Your choices</h2>
      <ul>
        <li>Edit your profile, email and password any time under Accounts.</li>
        <li>Delete any record, or your whole account, from inside the app. Deleting your account permanently removes all of your data.</li>
        <li>Ask us for a copy of your data or any other privacy request{support ? <> at <a className="text-gold-2 underline" href={`mailto:${support}`}>{support}</a></> : " via the contact address in the footer"}.</li>
      </ul>

      <h2>Children</h2>
      <p>Velora is not intended for anyone under 18.</p>

      <h2>Changes</h2>
      <p>If we make material changes, we’ll update the date above and let you know in the app.</p>
    </article>
  );
}
