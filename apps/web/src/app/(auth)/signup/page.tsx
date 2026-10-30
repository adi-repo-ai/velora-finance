"use client";

import { fieldErrors, signUpSchema } from "@velora/schemas";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ErrorNote } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearErrorOnEdit, Field } from "@/components/ui/label";
import { getSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function SignUpPage() {
  const router = useRouter();
  const [country, setCountry] = useState<"US" | "IN">("US");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<Error | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = signUpSchema.safeParse({ ...Object.fromEntries(new FormData(e.currentTarget)), homeCountry: country });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    const { email, password, displayName, homeCountry } = parsed.data;
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName, home_country: homeCountry }, emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) return setFailure(error);
    if (data.session) router.replace("/");
    else setSentTo(email); // email confirmation is on
  }

  if (sentTo) {
    return (
      <div className="glass enter grid gap-3 p-8 text-center">
        <h1 className="font-serif text-4xl">Check your <em className="text-gold-2">inbox.</em></h1>
        <p className="text-sm text-muted">We sent a confirmation link to <b className="text-text">{sentTo}</b>.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="glass enter grid gap-5 p-8" noValidate onChange={clearErrorOnEdit(setErrors)}>
      <h1 className="font-serif text-4xl">Open your <em className="text-gold-2">vault.</em></h1>
      <Field id="displayName" label="Your name" error={errors.displayName}><Input id="displayName" name="displayName" autoComplete="given-name" aria-invalid={!!errors.displayName} /></Field>
      <div className="grid gap-2">
        <span className="label-mono" id="country-label">Where you bank</span>
        <div role="radiogroup" aria-labelledby="country-label" className="grid grid-cols-2 gap-2">
          {([["US", "🇺🇸 United States", "USD"], ["IN", "🇮🇳 India", "INR"]] as const).map(([c, label, cur]) => (
            <button
              type="button" role="radio" aria-checked={country === c} key={c} onClick={() => setCountry(c)}
              className={cn("rounded-2xl border border-line bg-white/50 px-4 py-3 text-left text-sm transition", country === c && "border-gold-1 bg-white shadow-[0_0_0_3px_rgb(201_155_91/.2)]")}
            >
              {label}<span className="block font-mono text-[11px] text-faint">{cur}</span>
            </button>
          ))}
        </div>
      </div>
      <Field id="email" label="Email" error={errors.email}><Input id="email" name="email" type="email" autoComplete="email" aria-invalid={!!errors.email} /></Field>
      <Field id="password" label="Password" error={errors.password}><Input id="password" name="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} /></Field>
      {failure && <ErrorNote error={failure} />}
      <Button type="submit" size="lg" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
      <p className="text-center text-sm text-muted">Already have one? <Link href="/login" className="font-medium text-gold-2 underline-offset-4 hover:underline">Sign in</Link></p>
    </form>
  );
}
