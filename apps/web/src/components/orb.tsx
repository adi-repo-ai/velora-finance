/** Glass sphere filled with liquid gold whose surface sloshes. `pct` is 0–1. */
export function Orb({ size, pct, children }: { size: number; pct: number; children?: React.ReactNode }) {
  const W = size;
  const wave = (amp: number, phase: number) => {
    let d = `M0 ${amp}`;
    for (let x = 0; x <= W * 2; x += 4) d += ` L${x} ${(amp + Math.sin((x / W) * 4 * Math.PI + phase) * amp).toFixed(2)}`;
    return `${d} L${W * 2} ${size} L0 ${size}Z`;
  };
  const fill = Math.min(Math.max(pct, 0), 1);
  return (
    <div
      role="img"
      aria-label={`${Math.round(fill * 100)}% saved`}
      className="relative shrink-0 overflow-hidden rounded-full bg-surface/50 shadow-[inset_0_0_0_1px_#fff,inset_0_-20px_40px_rgb(120_90_40/.12),0_20px_60px_-10px_rgb(170_120_60/.35)]"
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-x-0 bottom-0 animate-[rise_2.4s_var(--ease-out-expo)_.3s_both]" style={{ height: `${fill * 100}%` }}>
        {[{ amp: 7, phase: 1.6, dur: "8s", op: 0.5, color: "#c4934f", rev: true }, { amp: 6, phase: 0, dur: "5s", op: 1, color: "url(#orbGold)", rev: false }].map((w) => (
          <svg
            key={w.dur}
            className="absolute bottom-0 left-0 h-[calc(100%+10px)] w-[200%]"
            style={{ animation: `slosh ${w.dur} linear infinite ${w.rev ? "reverse" : ""}`, opacity: w.op }}
            viewBox={`0 0 ${W * 2} ${size}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="orbGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fbe6bb" />
                <stop offset="1" stopColor="#a87634" />
              </linearGradient>
            </defs>
            <path d={wave(w.amp, w.phase)} fill={w.color} />
          </svg>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_22%,rgb(255_255_255/.7),transparent_22%),radial-gradient(circle_at_72%_82%,rgb(255_255_255/.2),transparent_25%)]" />
      {/* The label sits mid-orb: dark on the gold liquid, theme text colour on the empty glass above it. */}
      <div className={`absolute inset-0 grid place-items-center text-center ${fill >= 0.5 ? "text-[#1d1307]" : "text-text"}`}>{children}</div>
    </div>
  );
}
