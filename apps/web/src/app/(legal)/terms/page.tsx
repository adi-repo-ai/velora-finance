import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of service · Velora" };

export default function TermsPage() {
  return (
    <article>
      <p className="label-mono">Legal</p>
      <h1 className="mt-2 font-serif text-6xl leading-none">Terms of <em className="text-gold-2">service.</em></h1>
      <p>Last updated 1 November 2026. By using Velora you agree to these terms.</p>

      <h2>What Velora is</h2>
      <p>Velora is a personal finance tracker. It organises information you provide. It is not a bank, broker or financial adviser, it doesn’t hold or move money, and nothing in it is financial, tax or legal advice.</p>

      <h2>Your account</h2>
      <ul>
        <li>Keep your sign-in details safe. You’re responsible for activity on your account.</li>
        <li>Provide accurate information and use Velora only for lawful, personal purposes.</li>
        <li>You can stop using Velora and delete your account at any time.</li>
      </ul>

      <h2>Your data</h2>
      <p>You own the data you add. You give us permission to store and process it only to run the service for you, as described in our <a className="text-gold-2 underline" href="/privacy">Privacy policy</a>.</p>

      <h2>Accuracy</h2>
      <p>Balances, budgets and insights depend on what you enter or import. Always check important figures against your bank or card statements.</p>

      <h2>Availability</h2>
      <p>We work to keep Velora running but can’t promise it will always be available or error-free. Features may change.</p>

      <h2>Liability</h2>
      <p>To the extent the law allows, Velora is provided “as is”, and we aren’t liable for indirect losses or decisions made based on the app.</p>

      <h2>Trademarks</h2>
      <p>Company names and logos shown for subscriptions belong to their owners and are used only to identify the service.</p>

      <h2>Changes</h2>
      <p>We may update these terms. If you keep using Velora after a change, you accept the updated terms.</p>
    </article>
  );
}
