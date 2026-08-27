import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          // Laranja é a cor dominante da marca (botões, títulos, header/footer,
          // navegação ativa, ícones) — ver documentação.md > Identidade visual.
          forest: "#EF8523",
          forestDark: "#BA681B",
          // Verde vira suporte secundário discreto (eyebrows, detalhes, placeholders).
          moss: "#53735A",
          sage: "#A3B89A",
          cream: "#F7F3EA",
          beige: "#E7E3D8",
          gold: "#CBB89A",
          graphite: "#2E2E2E",
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        soft: "0 4px 24px -8px rgba(46, 75, 62, 0.12)",
        softer: "0 2px 12px -4px rgba(46, 75, 62, 0.08)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-14px) rotate(3deg)" },
        },
        pulseSoft: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(46,75,62,0.35)" },
          "70%": { boxShadow: "0 0 0 12px rgba(46,75,62,0)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(calc(-100% - var(--gap)))" },
        },
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        floatSlow: "float 11s ease-in-out infinite",
        pulseSoft: "pulseSoft 2.4s ease-out infinite",
        marquee: "marquee var(--duration) linear infinite",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
