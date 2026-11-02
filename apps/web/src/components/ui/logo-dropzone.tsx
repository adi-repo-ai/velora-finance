"use client";

import { CheckCircle2, ImageUp, Loader2, X } from "lucide-react";
import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { fileToLogo, LOGO_PX } from "@/lib/logo";
import { cn } from "@/lib/utils";

/**
 * Drag-and-drop (or click to browse) logo upload. Images are fitted to 128×128 in the browser and handed
 * back as a small data URL. `preview` shows when there's no upload yet (e.g. the brand's own logo).
 */
export function LogoDropzone({ value, onChange, preview }: { value: string | null; onChange: (v: string | null) => void; preview: ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);

  async function take(f?: File) {
    setError(undefined);
    if (!f) return;
    setBusy(true);
    try {
      onChange(await fileToLogo(f));
      setFile({ name: f.name, size: f.size });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t use that image");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function drop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    void take(e.dataTransfer.files[0]);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload logo: drop an image here or press to browse"
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), input.current?.click())}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        className={cn(
          "group relative flex items-center gap-4 overflow-hidden rounded-3xl border-2 border-dashed border-line bg-surface/40 p-4 transition",
          "hover:border-gold-1/70 hover:bg-surface/60 focus-visible:outline-2 focus-visible:outline-gold-1",
          over && "scale-[1.01] border-gold-1 bg-gold-1/10 shadow-[0_0_0_6px_rgb(201_155_91/.15)]",
        )}
      >
        <div className="relative">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
            <img src={value} alt="" className="size-16 rounded-2xl bg-white object-contain shadow-[inset_0_0_0_1px_rgb(23_20_15/.08)]" />
          ) : preview}
          {busy && <span className="absolute inset-0 grid place-items-center rounded-2xl bg-surface/80"><Loader2 className="size-5 animate-spin text-gold-2" /></span>}
        </div>
        <div className="min-w-0 flex-1">
          {value && file ? (
            <>
              <p className="flex items-center gap-1.5 truncate text-sm font-medium"><CheckCircle2 className="size-4 shrink-0 text-positive" aria-hidden />{file.name}</p>
              <p className="text-xs text-muted">{file.size < 1024 ? "<1" : (file.size / 1024).toFixed(0)} KB · fitted to {LOGO_PX}×{LOGO_PX}</p>
            </>
          ) : (
            <>
              <p className="flex items-center gap-2 text-sm font-medium"><ImageUp className="size-4 text-gold-2 transition group-hover:-translate-y-0.5" aria-hidden />{value ? "Your logo" : over ? "Drop to upload" : "Drop a logo here, or click to browse"}</p>
              <p className="text-xs text-muted">PNG, JPG, WebP or SVG · up to 5 MB · fitted to {LOGO_PX}×{LOGO_PX}</p>
            </>
          )}
        </div>
        {value && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null); setFile(null); }}
            aria-label="Remove logo"
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-negative/10 hover:text-negative"
          >
            <X className="size-4" />
          </button>
        )}
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" className="sr-only" tabIndex={-1} onChange={(e) => take(e.target.files?.[0])} />
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-negative">{error}</p>}
    </div>
  );
}
