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
      // Como cor de texto, o laranja da marca fica em 2.4:1 sobre o creme — reprova o
      // WCAG até para título grande. `text-brand-forest` usa um tom tijolo (5:1 no creme,
      // 5.5:1 no branco); fundos, bordas e anéis seguem com o laranja vivo.
      textColor: {
        brand: {
          forest: "#A4520E",
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        hand: ["var(--font-hand)", "cursive"],
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
        // Anel que se expande atrás do botão: só transform/opacity, para rodar na GPU
        // (animar box-shadow em loop repinta o botão a cada quadro).
        pulseSoft: {
          "0%": { transform: "scale(1)", opacity: "0.35" },
          "70%, 100%": { transform: "scale(1.43)", opacity: "0" },
        },
        snip: {
          "0%, 58%, 100%": { transform: "rotate(0deg)" },
          "29%": { transform: "rotate(-14deg)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(calc(-100% - var(--gap)))" },
        },
        "nudge-x": {
          "0%, 100%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(6px)" },
        },
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        floatSlow: "float 11s ease-in-out infinite",
        pulseSoft: "pulseSoft 2.4s ease-out infinite",
        snip: "snip 1.2s ease-in-out infinite",
        marquee: "marquee var(--duration) linear infinite",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
        "nudge-x": "nudge-x 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
