import type { SubscriptionCategory } from "@velora/schemas";

export const CATEGORIES: Record<SubscriptionCategory, { label: string; icon: string }> = {
  streaming: { label: "Streaming & TV", icon: "🎬" },
  music: { label: "Music & audio", icon: "🎵" },
  cloud: { label: "Cloud storage", icon: "☁️" },
  software: { label: "Software & productivity", icon: "💼" },
  ai: { label: "AI tools", icon: "✨" },
  gaming: { label: "Gaming", icon: "🎮" },
  news: { label: "News & reading", icon: "📰" },
  fitness: { label: "Fitness & health", icon: "💪" },
  education: { label: "Learning", icon: "🎓" },
  food: { label: "Food & delivery", icon: "🍔" },
  shopping: { label: "Shopping & memberships", icon: "🛍️" },
  telecom: { label: "Phone & internet", icon: "📱" },
  other: { label: "Other", icon: "📦" },
};

/** Popular services in the US and India; picking one fills the name, logo and category. */
export const POPULAR: [string, string, SubscriptionCategory][] = [
  ["Netflix", "netflix.com", "streaming"], ["Spotify", "spotify.com", "music"], ["YouTube Premium", "youtube.com", "streaming"],
  ["Prime Video", "primevideo.com", "streaming"], ["Disney+ Hotstar", "hotstar.com", "streaming"], ["JioCinema", "jiocinema.com", "streaming"],
  ["SonyLIV", "sonyliv.com", "streaming"], ["ZEE5", "zee5.com", "streaming"], ["Apple One", "apple.com", "streaming"],
  ["iCloud+", "icloud.com", "cloud"], ["Google One", "one.google.com", "cloud"], ["ChatGPT Plus", "openai.com", "ai"],
  ["Claude Pro", "claude.ai", "ai"], ["Microsoft 365", "microsoft.com", "software"], ["Adobe Creative Cloud", "adobe.com", "software"],
  ["Canva Pro", "canva.com", "software"], ["Notion", "notion.so", "software"], ["Dropbox", "dropbox.com", "cloud"],
  ["LinkedIn Premium", "linkedin.com", "education"], ["Audible", "audible.com", "music"], ["Kindle Unlimited", "amazon.com", "news"],
  ["Swiggy One", "swiggy.com", "food"], ["Zomato Gold", "zomato.com", "food"], ["Hulu", "hulu.com", "streaming"],
  ["Max", "max.com", "streaming"], ["Duolingo", "duolingo.com", "education"],
];

/** Name → website and category for well-known services (used when importing). */
export function lookupService(name: string): { website: string; category: SubscriptionCategory } | null {
  const n = name.toLowerCase();
  const hit = POPULAR.find(([p]) => n.includes(p.toLowerCase().split(" ")[0]!));
  return hit ? { website: hit[1], category: hit[2] } : null;
}

/** Matches a category typed in a spreadsheet ("Streaming", "music", "AI") to ours. */
export function matchCategory(text: string | null): SubscriptionCategory | null {
  if (!text) return null;
  const t = text.toLowerCase();
  const entry = (Object.entries(CATEGORIES) as [SubscriptionCategory, { label: string }][])
    .find(([k, v]) => t === k || v.label.toLowerCase().includes(t) || t.includes(k));
  return entry?.[0] ?? null;
}
