// Single source of truth for Velora's Pearl design tokens (see docs/design/DESIGN.md).
// Values live in tokens.json so CommonJS tooling (NativeWind's tailwind.config.js) can read them too.

import tokens from './tokens.json';

/** Colour channels (`r g b` or `r g b / a`) so both CSS `rgb(var(--x))` and JS can use them. */
export const pearl = tokens.pearl;

export type ColorToken = keyof typeof pearl;

/** `rgb(...)` string for a token — for SVG, chart and React Native style props. */
export const rgb = (token: ColorToken) => `rgb(${pearl[token]})`;

/** CSS variable declarations, e.g. `--ink: 242 238 230;`. */
export const pearlVars = Object.entries(pearl)
  .map(([k, v]) => `--${k}: ${v};`)
  .join(' ');

/** Chart series colours in display order. */
export const series = ['gold-1', 'sky', 'lilac', 'negative', 'positive'] as const satisfies readonly ColorToken[];

export const isColorToken = (s: string): s is ColorToken => s in pearl;

export const motion = {
  enter: { duration: 1100, stagger: 110 },
  countUp: { duration: 2200 },
} as const;
