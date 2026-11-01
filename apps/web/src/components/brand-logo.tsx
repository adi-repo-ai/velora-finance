"use client";

import {
  siAirtel, siApplemusic, siAppletv, siApple, siAudible, siClaude, siDropbox, siDuolingo, siGoogle, siHbomax,
  siIcloud, siJio, siMax, siNetflix, siNotion, siSpotify, siSwiggy, siYoutube, siYoutubemusic, siZomato, type SimpleIcon,
} from "simple-icons";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Official brand marks bundled with the app (crisp, no third-party request). Longer domains first so
// music.youtube.com wins over youtube.com.
const BUNDLED: [string, SimpleIcon][] = [
  ["music.youtube.com", siYoutubemusic], ["music.apple.com", siApplemusic], ["tv.apple.com", siAppletv], ["one.google.com", siGoogle],
  ["netflix.com", siNetflix], ["spotify.com", siSpotify], ["youtube.com", siYoutube], ["icloud.com", siIcloud], ["apple.com", siApple],
  ["claude.ai", siClaude], ["notion.so", siNotion], ["dropbox.com", siDropbox], ["audible.com", siAudible], ["audible.in", siAudible],
  ["swiggy.com", siSwiggy], ["zomato.com", siZomato], ["max.com", siMax], ["hbomax.com", siHbomax], ["duolingo.com", siDuolingo],
  ["jio.com", siJio], ["airtel.in", siAirtel], ["google.com", siGoogle],
];

export function bundledIcon(domain: string): SimpleIcon | undefined {
  return BUNDLED.find(([d]) => domain === d || domain.endsWith(`.${d}`))?.[1];
}

/**
 * Company logo: the user's own upload, else a bundled official mark when we have one, otherwise the site's own icon (via Google's
 * favicon service), otherwise the first letter.
 */
export function BrandLogo({ name, domain, src, className }: { name: string; domain?: string | null; src?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  const box = cn("grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-[inset_0_0_0_1px_rgb(23_20_15/.08)]", className);
  if (src) {
    return (
      <span className={box} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded data URL */}
        <img src={src} alt="" className="size-full object-contain" />
      </span>
    );
  }
  const icon = domain ? bundledIcon(domain) : undefined;
  if (icon) {
    return (
      <span className={box} aria-hidden>
        <svg viewBox="0 0 24 24" className="size-[55%]" fill={`#${icon.hex}`}><path d={icon.path} /></svg>
      </span>
    );
  }
  if (!domain || failed) {
    return <span className={cn(box, "bg-gold-2 font-serif text-xl text-on-gold")} aria-hidden>{name.trim()[0]?.toUpperCase() ?? "•"}</span>;
  }
  return (
    <span className={box} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny third-party favicon; next/image would need remote config for no gain */}
      <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`} alt="" className="size-[65%] object-contain" loading="lazy" onError={() => setFailed(true)} />
    </span>
  );
}
