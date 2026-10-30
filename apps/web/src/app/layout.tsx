import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import type { CSSProperties } from "react";
import { pearl } from "@velora/config";
import { Providers } from "./providers";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrument = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

const tokenVars = Object.fromEntries(Object.entries(pearl).map(([k, v]) => [`--${k}`, v])) as CSSProperties;

export const metadata: Metadata = {
  title: "Velora",
  description: "Your money, all in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" style={tokenVars} className={`${geist.variable} ${geistMono.variable} ${instrument.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="ambient" aria-hidden />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
