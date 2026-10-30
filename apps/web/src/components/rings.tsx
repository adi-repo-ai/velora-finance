import type { ColorToken } from "@velora/config";

/** Concentric progress rings; each part is [fraction 0–1, colour token]. */
export function Rings({ size, parts, label }: { size: number; parts: [number, ColorToken][]; label: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90" role="img" aria-label={label}>
      {parts.map(([v, c], i) => {
        const r = 44 - i * 11;
        const C = 2 * Math.PI * r;
        return (
          <g key={i}>
            <circle r={r} cx="50" cy="50" fill="none" stroke="currentColor" strokeOpacity=".08" strokeWidth="5" />
            <circle
              r={r} cx="50" cy="50" fill="none" strokeWidth="5" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(Math.max(v, 0), 1))}
              style={{ stroke: `rgb(var(--${c}))`, transition: "stroke-dashoffset 1.6s cubic-bezier(.16,1,.3,1)" }}
            />
          </g>
        );
      })}
    </svg>
  );
}
