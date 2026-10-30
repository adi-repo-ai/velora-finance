// Colours come from the shared tokens (Pearl / Noir) via CSS variables set in app/_layout.tsx.
const { pearl } = require('@velora/config/tokens.json');

// Tokens that carry their own alpha can't take Tailwind opacity modifiers.
const color = (k, v) => (v.includes('/') ? `rgb(var(--${k}))` : `rgb(var(--${k}) / <alpha-value>)`);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Pearl is light-only; 'class' stops NativeWind from following the OS dark setting.
  darkMode: 'class',
  theme: {
    extend: {
      colors: Object.fromEntries(Object.entries(pearl).map(([k, v]) => [k, color(k, v)])),
      fontFamily: {
        serif: ['InstrumentSerif_400Regular'],
        'serif-italic': ['InstrumentSerif_400Regular_Italic'],
        sans: ['Geist_400Regular'],
        medium: ['Geist_500Medium'],
        semibold: ['Geist_600SemiBold'],
        mono: ['GeistMono_400Regular'],
      },
    },
  },
};
