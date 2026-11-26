import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      // Cores em variáveis (RGB) para o painel trocar de paleta e de tema sem mexer nas
      // classes: o :root guarda os valores do site e o body.painel a paleta verde
      // (claro e escuro), ver globals.css. `forest` segue laranja nos dois — é o acento
      // de fundo, sempre com texto `ink` por cima.
      colors: {
        white: "rgb(var(--c-white) / <alpha-value>)",
        snow: "#FFFFFF",
        brand: {
          forest: "rgb(var(--c-forest) / <alpha-value>)",
          forestDark: "rgb(var(--c-forest-dark) / <alpha-value>)",
          moss: "rgb(var(--c-moss) / <alpha-value>)",
          sage: "rgb(var(--c-sage) / <alpha-value>)",
          cream: "rgb(var(--c-cream) / <alpha-value>)",
          beige: "rgb(var(--c-beige) / <alpha-value>)",
          gold: "rgb(var(--c-gold) / <alpha-value>)",
          graphite: "rgb(var(--c-graphite) / <alpha-value>)",
          // Texto escuro fixo: sobre o laranja/dourado, também no tema escuro.
          ink: "rgb(var(--c-ink) / <alpha-value>)",
          // Verde profundo da lateral do painel e o texto claro que vai por cima.
          pine: "rgb(var(--c-pine) / <alpha-value>)",
          pineSoft: "rgb(var(--c-pine-soft) / <alpha-value>)",
          onPine: "rgb(var(--c-on-pine) / <alpha-value>)",
        },
      },
      // Como cor de texto, o laranja da marca fica em 2.4:1 sobre o creme — reprova o
      // WCAG até para título grande. No site, `text-brand-forest` é um tom tijolo
      // (5:1 no creme); no painel, o verde dos títulos.
      textColor: {
        brand: {
          forest: "rgb(var(--c-forest-text) / <alpha-value>)",
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
        soft: "0 4px 24px -8px rgb(var(--c-shadow) / 0.14)",
        softer: "0 2px 12px -4px rgb(var(--c-shadow) / 0.09)",
        lift: "0 18px 40px -18px rgb(var(--c-shadow) / 0.28)",
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
