"use client";

import { AlertTriangle } from "lucide-react";
import { AlertDialog } from "radix-ui";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Styled replacement for window.confirm. `onConfirm` may be async; the dialog stays open
 * (with the error shown) if it throws. `requireText` makes the user type a word to confirm.
 */
export function ConfirmDialog({
  trigger, title, description, confirmLabel = "Delete", onConfirm, requireText,
}: {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  onConfirm: () => unknown;
  requireText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const blocked = Boolean(requireText) && typed.trim() !== requireText;

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setError(null); setTyped(""); } }}>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-[rgb(20_15_8/.35)] backdrop-blur-sm data-[state=open]:animate-[fadein_.2s_ease]" />
        <AlertDialog.Content className="glass fixed left-1/2 top-1/2 z-50 grid w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 gap-5 rounded-[28px] p-7 outline-none data-[state=open]:animate-[fadein_.2s_ease]">
          <div className="flex gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-negative/12 text-negative" aria-hidden>
              <AlertTriangle className="size-5" />
            </span>
            <div className="grid gap-1.5">
              <AlertDialog.Title className="font-serif text-3xl leading-tight">{title}</AlertDialog.Title>
              <AlertDialog.Description className="text-sm leading-relaxed text-muted">{description}</AlertDialog.Description>
            </div>
          </div>
          {requireText && (
            <label className="grid gap-2 text-sm">
              <span className="text-muted">Type <b className="font-mono text-text">{requireText}</b> to confirm</span>
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
            </label>
          )}
          {error && <p role="alert" className="rounded-2xl bg-negative/10 px-4 py-3 text-sm text-negative">{error}</p>}
          <div className="flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="glass" disabled={busy}>Cancel</Button>
            </AlertDialog.Cancel>
            {/* Not AlertDialog.Action: it would close before an async delete finishes. */}
            <Button variant="destructive" onClick={confirm} disabled={busy || blocked}>
              {busy ? "Working…" : confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
