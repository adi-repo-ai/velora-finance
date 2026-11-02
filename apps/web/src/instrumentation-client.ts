import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// After a new deploy, a tab opened earlier can ask for code files that no longer exist
// ("Failed to load chunk …"). Reload once to pick up the new version instead of showing an error.
if (typeof window !== "undefined") {
  const isChunkError = (m: unknown) => /Failed to load chunk|ChunkLoadError|Loading chunk .* failed|Failed to fetch dynamically imported module/i.test(String(m));
  const recover = (m: unknown) => {
    if (!isChunkError(m)) return;
    let last = 0;
    try { last = Number(sessionStorage.getItem("velora-chunk-reload") ?? 0); } catch { /* storage blocked */ }
    if (Date.now() - last < 60_000) return; // reloaded a moment ago: don't loop
    try { sessionStorage.setItem("velora-chunk-reload", String(Date.now())); } catch { /* storage blocked */ }
    location.reload();
  };
  window.addEventListener("error", (e) => recover(e.message || e.error));
  window.addEventListener("unhandledrejection", (e) => recover(e.reason?.message ?? e.reason));
}
