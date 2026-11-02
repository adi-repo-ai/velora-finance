import { Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";

async function year() {
  "use cache"; // fixed at build time; every deploy refreshes it
  return new Date().getFullYear();
}

const COLUMNS = [
  ["Product", [["/", "Pulse"], ["/activity", "Activity"], ["/plan", "Plan"], ["/bills", "Bills"], ["/subscriptions", "Subscriptions"], ["/wealth", "Wealth"]]],
  ["Account", [["/accounts#profile", "Profile"], ["/accounts#accounts", "Bank accounts"], ["/accounts#security", "Sign-in & security"], ["/accounts#help", "Help & FAQ"]]],
  ["Legal", [["/privacy", "Privacy policy"], ["/terms", "Terms of service"]]],
] as const;

function Mark() {
  return <span className="size-8 shrink-0 rounded-full bg-[conic-gradient(from_0deg,#c99b5b,#7a5226,#f3dcb0,#7a5226,#c99b5b)] shadow-[0_0_16px_rgb(201_155_91/.45),inset_0_0_0_1px_rgb(255_255_255/.5)]" aria-hidden />;
}

/** Site footer. `compact` is for signed-out pages: brand, legal links and copyright only. */
export async function Footer({ compact = false }: { compact?: boolean }) {
  const support = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const bottom = (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-muted">
      <p>© {await year()} Velora. All rights reserved.</p>
      <p className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-gold-2" aria-hidden />Velora is not a bank and never moves your money.</p>
      <nav aria-label="Legal" className="flex gap-4">
        <Link href="/privacy" className="hover:text-text">Privacy</Link>
        <Link href="/terms" className="hover:text-text">Terms</Link>
        {support && <a href={`mailto:${support}`} className="hover:text-text">Contact</a>}
      </nav>
    </div>
  );

  if (compact) {
    return (
      <footer className="flex items-center justify-center gap-2 whitespace-nowrap text-xs text-muted">
        <span>© {await year()} Velora. All rights reserved.</span><span aria-hidden>·</span>
        <Link href="/privacy" className="hover:text-text">Privacy</Link><span aria-hidden>·</span>
        <Link href="/terms" className="hover:text-text">Terms</Link>
        {support && <><span aria-hidden>·</span><a href={`mailto:${support}`} className="hover:text-text">Contact</a></>}
      </footer>
    );
  }

  return (
    <footer className="glass mx-auto mt-6 w-full max-w-[1380px] p-8 sm:p-10">
      <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="col-span-2 grid content-start gap-4 md:col-span-1">
          <Link href="/" className="flex w-fit items-center gap-3 font-serif text-3xl"><Mark />Velora</Link>
          <p className="max-w-xs text-sm leading-relaxed text-muted">Your money, all in one place. Net worth, cash flow, budgets, goals, bills and subscriptions for the US and India.</p>
          <p className="text-sm text-muted">🇺🇸 USD · 🇮🇳 INR</p>
          {support && (
            <a href={`mailto:${support}`} className="flex w-fit items-center gap-2 rounded-full bg-surface/70 px-4 py-2 text-sm font-medium shadow-[0_6px_18px_rgb(80_60_30/.12)] hover:bg-surface">
              <Mail className="size-4 text-gold-2" aria-hidden />{support}
            </a>
          )}
        </div>
        {COLUMNS.map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <p className="label-mono">{title}</p>
            <ul className="mt-4 grid gap-2.5 text-sm">
              {links.map(([href, label]) => <li key={href}><Link href={href} className="text-muted transition hover:text-text">{label}</Link></li>)}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mt-10 border-t border-line pt-6">{bottom}</div>
    </footer>
  );
}
