import { Label as LabelPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root data-slot="label" className={cn("label-mono", className)} {...props} />;
}

/** Label + control + inline error, wired for screen readers. */
export function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p id={`${id}-error`} role="alert" className="text-[13px] text-negative">{error}</p>}
    </div>
  );
}

/** Form `onChange` handler that clears a field's error as soon as the user edits it. */
export function clearErrorOnEdit(setErrors: (fn: (prev: Record<string, string>) => Record<string, string>) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    const name = (e.target as HTMLInputElement).name;
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };
}
