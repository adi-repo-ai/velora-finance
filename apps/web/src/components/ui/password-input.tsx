"use client";

import { generatePassword, passwordStrength } from "@velora/core";
import { Check, Copy, Eye, EyeOff, Sparkles } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const BAR = ["bg-negative", "bg-negative", "bg-gold-1", "bg-positive/70", "bg-positive"];

/**
 * Password field with a show/hide toggle. With `suggest`, also shows a strength meter and a
 * button that fills in a strong random password (and reveals it so it can be saved).
 */
export function PasswordInput({
  suggest = false, onSuggest, value: controlled, onChange, className, ...props
}: Omit<ComponentProps<"input">, "type" | "value"> & { suggest?: boolean; onSuggest?: (pw: string) => void; value?: string }) {
  const [shown, setShown] = useState(false);
  const [own, setOwn] = useState("");
  const [copied, setCopied] = useState(false);
  const value = controlled ?? own;
  const strength = passwordStrength(value);

  function fill() {
    const pw = generatePassword();
    setOwn(pw);
    setShown(true);
    setCopied(false);
    onSuggest?.(pw);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard blocked (permissions/insecure context): the password is visible, so the user can copy it by hand.
    }
  }

  return (
    <div className="grid gap-2">
      <div className="relative">
        <Input
          {...props}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => { setOwn(e.target.value); setCopied(false); onChange?.(e); }}
          className={cn("pr-12", shown && value && "font-mono tracking-wide", className)}
          spellCheck={false}
          autoCapitalize="off"
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-muted transition hover:bg-surface hover:text-text focus-visible:outline-2 focus-visible:outline-gold-1"
        >
          {shown ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
      {suggest && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          {value ? (
            <span className="flex items-center gap-2" aria-live="polite">
              <span className="flex gap-1" aria-hidden>
                {[1, 2, 3, 4].map((i) => <span key={i} className={cn("h-1.5 w-6 rounded-full bg-text/10", strength.score >= i && BAR[strength.score])} />)}
              </span>
              <span className="text-muted">{strength.label}</span>
            </span>
          ) : (
            <span className="text-muted">At least 8 characters. Longer is stronger.</span>
          )}
          <span className="ml-auto flex gap-1">
            {value && shown && (
              <button type="button" onClick={copy} className="flex items-center gap-1 rounded-full px-2.5 py-1 font-medium text-muted hover:bg-surface hover:text-text">
                {copied ? <Check className="size-3.5 text-positive" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}{copied ? "Copied" : "Copy"}
              </button>
            )}
            <button type="button" onClick={fill} className="flex items-center gap-1 rounded-full px-2.5 py-1 font-medium text-gold-2 hover:bg-surface">
              <Sparkles className="size-3.5" aria-hidden />Suggest strong password
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
