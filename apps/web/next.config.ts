import type { NextConfig } from "next";

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const sentry = process.env.NEXT_PUBLIC_SENTRY_DSN ? "https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io" : "";

// Browser-enforced allow-list of where this site may load code and send data. Inline scripts are
// needed for Next.js on statically rendered pages; everything else is limited to us and Supabase.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.google.com https://*.gstatic.com",
  "font-src 'self'",
  `connect-src 'self' ${supabase} ${supabase.replace(/^http/, "ws")} ${sentry}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Shared workspace packages ship TypeScript source.
  transpilePackages: ["@velora/config", "@velora/core", "@velora/schemas", "@velora/data"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
