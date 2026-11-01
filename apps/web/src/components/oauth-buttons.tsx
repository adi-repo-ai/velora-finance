"use client";

import type { Provider } from "@supabase/supabase-js";
import { useState } from "react";
import { ErrorNote } from "@/components/states";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase/client";

const LABELS: Partial<Record<Provider, string>> = { google: "Google", github: "GitHub", azure: "Microsoft", apple: "Apple" };

/** Only providers switched on in Supabase Auth should be listed here, or the button errors. */
const PROVIDERS = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "google")
  .split(",")
  .map((p) => p.trim())
  .filter((p): p is Provider => p in LABELS);

const ICONS: Partial<Record<Provider, React.ReactNode>> = {
  google: (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden>
      <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.7-2.8z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="currentColor" aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5z" />
    </svg>
  ),
  azure: (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden>
      <path fill="#F25022" d="M2 2h9.5v9.5H2z" /><path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" /><path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
    </svg>
  ),
  apple: (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="currentColor" aria-hidden>
      <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM13.9 4.9c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z" />
    </svg>
  ),
};

export function OAuthButtons() {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<Error | null>(null);
  if (PROVIDERS.length === 0) return null;

  async function go(provider: Provider) {
    setBusy(provider);
    setError(null);
    const { error: err } = await getSupabase().auth.signInWithOAuth({ provider, options: { redirectTo: `${location.origin}/auth/callback` } });
    // On success the browser leaves the page, so only failures land here.
    if (err) { setError(err); setBusy(null); }
  }

  return (
    <div className="grid gap-3">
      <div className={PROVIDERS.length > 1 ? "grid gap-3 sm:grid-cols-2" : "grid"}>
        {PROVIDERS.map((p) => (
          <Button key={p} type="button" variant="glass" size="lg" disabled={busy !== null} onClick={() => go(p)} aria-label={`Continue with ${LABELS[p]}`} className={PROVIDERS.length > 2 && p === PROVIDERS[0] ? "sm:col-span-2" : undefined}>
            {ICONS[p]}{busy === p ? "Redirecting…" : PROVIDERS.length > 1 ? LABELS[p] : `Continue with ${LABELS[p]}`}
          </Button>
        ))}
      </div>
      {error && <ErrorNote error={error} />}
      <div className="flex items-center gap-3 text-xs text-muted" aria-hidden><span className="h-px flex-1 bg-line" />or with email<span className="h-px flex-1 bg-line" /></div>
    </div>
  );
}
