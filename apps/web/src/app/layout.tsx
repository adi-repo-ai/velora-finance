import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { cssVars, pearl, noir, type ThemeName } from "@velora/config";
import { CookieNotice } from "@/components/cookie-notice";
import { Providers } from "./providers";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrument = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

const decls = (t: ThemeName) => Object.entries(cssVars(t)).map(([k, v]) => `${k}:${v}`).join(";");
// Pearl by default, Noir when the device is in dark mode. Pure CSS, so there is no flash on load.
const themeCss = `:root{color-scheme:light dark;${decls("pearl")}}@media (prefers-color-scheme:dark){:root{${decls("noir")}}}`;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: `rgb(${pearl.ink})` },
    { media: "(prefers-color-scheme: dark)", color: `rgb(${noir.ink})` },
  ],
};

export const metadata: Metadata = {
  title: "Velora",
  description: "Your money, all in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${instrument.variable} h-full antialiased`}>
      <head>
        <style>{themeCss}</style>
      </head>
      <body className="min-h-full">
        <div className="ambient" aria-hidden />
        <Providers>{children}</Providers>
        <CookieNotice />
      </body>
    </html>
  );
}
