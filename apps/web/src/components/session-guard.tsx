"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertDialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase/client";
import { endSession, expiredReason, hasSession, idleLimit, isRemembered, lastActive, markActive, startSession } from "@/lib/session";

const WARN_MS = 2 * 60_000;

/** Signs the user out after inactivity (with a 2-minute warning) or after the browser was closed. */
export function SessionGuard() {
  const router = useRouter();
  const qc = useQueryClient();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    async function end(reason: "idle" | "closed") {
      endSession();
      await getSupabase().auth.signOut();
      qc.clear();
      router.replace(`/login?reason=${reason}`);
    }
    if (!hasSession()) startSession(false);
    const reason = expiredReason();
    if (reason) { void end(reason); return; }

    let last = 0;
    const active = () => { if (Date.now() - last > 15_000) { last = Date.now(); markActive(); } };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, active, { passive: true }));
    const tick = setInterval(() => {
      const remaining = idleLimit() - (Date.now() - lastActive()); // lastActive is shared by every open tab
      if (remaining <= 0) return void end("idle");
      setLeft(!isRemembered() && remaining <= WARN_MS ? remaining : null);
    }, 1000);
    return () => { events.forEach((e) => window.removeEventListener(e, active)); clearInterval(tick); };
  }, [qc, router]);

  const secs = Math.ceil((left ?? 0) / 1000);
  return (
    <AlertDialog.Root open={left !== null}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-[rgb(20_15_8/.35)] backdrop-blur-sm" />
        <AlertDialog.Content className="glass fixed left-1/2 top-1/2 z-50 grid w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[28px] p-7 text-center outline-none">
          <AlertDialog.Title className="font-serif text-3xl">Still there?</AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-muted">
            For your security, you’ll be signed out in <b className="font-mono text-text">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</b> because of inactivity.
          </AlertDialog.Description>
          <div className="flex justify-center gap-2">
            <Button variant="glass" onClick={async () => { endSession(); await getSupabase().auth.signOut(); qc.clear(); router.replace("/login"); }}>Sign out</Button>
            <Button onClick={() => { markActive(); setLeft(null); }}>Stay signed in</Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
