"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

/**
 * Wraps a card with a gentle 3D tilt that follows the pointer, a moving light glare and a slowly
 * circling gold border. All motion is skipped for people who prefer reduced motion.
 */
export function TiltCard({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  function move(e: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Follow the pointer instantly: an easing tilt would keep the form moving under a click and swallow it.
    el.style.transition = "none";
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - y) * 8}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 10}deg`);
    el.style.setProperty("--gx", `${x * 100}%`);
    el.style.setProperty("--gy", `${y * 100}%`);
  }
  function leave() {
    ref.current?.style.removeProperty("transition");
    ref.current?.style.setProperty("--rx", "0deg");
    ref.current?.style.setProperty("--ry", "0deg");
  }

  return (
    <div className="[perspective:1400px]">
      <div ref={ref} onPointerMove={move} onPointerLeave={leave} className="tilt-card relative rounded-[30px]">
        <div className="relative">{children}</div>
        <div className="tilt-glare pointer-events-none absolute inset-0 rounded-[30px]" aria-hidden />
      </div>
    </div>
  );
}
