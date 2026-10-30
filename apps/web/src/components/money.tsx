"use client";

import { formatMoney, splitCents, type Currency } from "@velora/core";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Eases a number from 0 to `to` once; jumps straight there when reduced motion is on. */
export function useCountUp(to: number, duration = 2200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const ms = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : duration;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = ms ? Math.min((t - t0) / ms, 1) : 1;
      setValue(Math.round(to * (1 - Math.pow(1 - p, 5))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return value;
}

/** Serif hero amount with small italic gold cents: $284,512.60 */
export function HeroMoney({ minor, currency, className, animate = true }: { minor: number; currency: Currency; className?: string; animate?: boolean }) {
  const shown = useCountUp(minor);
  const { whole, cents } = splitCents(animate ? shown : minor, currency);
  return (
    <span className={cn("font-serif tracking-tight", className)} aria-label={formatMoney(minor, currency, { cents: true })}>
      <span aria-hidden>{whole}</span>
      <em aria-hidden className="text-[.42em] text-gold-2">{cents}</em>
    </span>
  );
}

export function Money({ minor, currency, sign, className }: { minor: number; currency: Currency; sign?: boolean; className?: string }) {
  return <span className={cn("font-serif tabular-nums", className)}>{formatMoney(minor, currency, { sign })}</span>;
}
