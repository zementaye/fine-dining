import type { Config } from "tailwindcss";

// Bespoke, art-directed palette for Gursha, a modern Ethiopian dining room:
// coffee-dark charcoal, injera-cream bone, brass for gold/jewelry accents, and
// berbere — the spice-market red — used sparingly as a second accent.
// Cormorant Garamond (display) pairs with Inter (body copy).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: { DEFAULT: "#1b1917", 50: "#f6f5f4", 800: "#242119", 900: "#0f0e0d" },
        bone: { DEFAULT: "#f4f0e8", 100: "#faf8f3" },
        brass: { DEFAULT: "#a8823f", 100: "#eadfc7", 600: "#8c6a30" },
        berbere: { DEFAULT: "#7a2a1f", 100: "#f2ddd4", 600: "#5c1f17" },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      letterSpacing: { widest2: "0.25em" },
      backgroundImage: {
        // A faint concentric-ring motif, echoing the woven mesob basket and
        // coffee-ceremony tray — used as a subtle section texture, never a photo stand-in.
        mesob: "repeating-radial-gradient(circle at 50% 50%, currentColor 0, currentColor 1px, transparent 1px, transparent 28px)",
      },
    },
  },
  plugins: [],
};
export default config;
