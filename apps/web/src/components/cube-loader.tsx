import { cn } from "@/lib/utils";

/** Three isometric gold cubes rising in turn. Decorative; pair it with visible or sr-only text. */
export function CubeLoader({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn("grid place-items-center gap-5", className)}>
      <div className="cube-stage" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="cube" style={{ ["--i" as string]: i }}>
            <span className="cube-top" /><span className="cube-left" /><span className="cube-right" />
          </div>
        ))}
      </div>
      <p className="label-mono text-muted">{label}</p>
    </div>
  );
}
