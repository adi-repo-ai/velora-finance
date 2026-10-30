"use client";

import { fieldErrors, signInSchema } from "@velora/schemas";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ErrorNote } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearErrorOnEdit, Field } from "@/components/ui/label";
import { getSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = signInSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    const { error } = await getSupabase().auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (error) return setFailure(error);
    router.replace("/");
  }

  return (
    <form onSubmit={submit} className="glass enter grid gap-5 p-8" noValidate onChange={clearErrorOnEdit(setErrors)}>
      <h1 className="font-serif text-4xl">Welcome <em className="text-gold-2">back.</em></h1>
      <Field id="email" label="Email" error={errors.email}><Input id="email" name="email" type="email" autoComplete="email" aria-invalid={!!errors.email} /></Field>
      <Field id="password" label="Password" error={errors.password}><Input id="password" name="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} /></Field>
      {failure && <ErrorNote error={failure} />}
      <Button type="submit" size="lg" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
      <p className="text-center text-sm text-muted">New to Velora? <Link href="/signup" className="font-medium text-gold-2 underline-offset-4 hover:underline">Create an account</Link></p>
    </form>
  );
}
