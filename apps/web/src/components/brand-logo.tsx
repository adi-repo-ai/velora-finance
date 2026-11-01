"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Company logo from its website's icon; falls back to the first letter when there's no site or it fails to load. */
export function BrandLogo({ name, domain, className }: { name: string; domain?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  const box = cn("grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-[inset_0_0_0_1px_rgb(23_20_15/.08)]", className);
  if (!domain || failed) {
    return <span className={cn(box, "bg-gold-2 font-serif text-xl text-on-gold")} aria-hidden>{name.trim()[0]?.toUpperCase() ?? "•"}</span>;
  }
  return (
    <span className={box} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny third-party favicon; next/image would need remote config for no gain */}
      <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`} alt="" className="size-8 object-contain" loading="lazy" onError={() => setFailed(true)} />
    </span>
  );
}
