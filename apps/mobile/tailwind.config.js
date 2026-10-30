// Colours come from the shared Pearl tokens so web and mobile stay identical.
const { pearl } = require('@velora/config/tokens.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Pearl is light-only; 'class' stops NativeWind from following the OS dark setting.
  darkMode: 'class',
  theme: {
    extend: {
      colors: Object.fromEntries(Object.entries(pearl).map(([k, v]) => [k, `rgb(${v})`])),
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
