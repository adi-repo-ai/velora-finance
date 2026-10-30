import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function Skeleton({ className = "h-6 w-32" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-text/[.06] ${className}`} />;
}

export function ErrorNote({ error }: { error: unknown }) {
  return (
    <p role="alert" className="rounded-2xl bg-negative/10 px-4 py-3 text-sm text-negative">
      {error instanceof Error ? error.message : "Something went wrong"}
    </p>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: { href: string; label: string } | ReactNode }) {
  return (
    <div className="grid place-items-center gap-3 px-6 py-14 text-center">
      <p className="font-serif text-3xl">{title}</p>
      <p className="max-w-sm text-sm text-muted">{body}</p>
      {action && typeof action === "object" && "href" in action ? (
        <Button asChild><Link href={action.href}>{action.label}</Link></Button>
      ) : (
        action
      )}
    </div>
  );
}
