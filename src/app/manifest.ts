import type { MetadataRoute } from "next";

/** Instalar o painel no celular ou no computador do balcão abre direto na agenda do dia. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Casa Herbert — Painel",
    short_name: "Casa Herbert",
    description: "Agenda, clientes, vendas e caixa da Casa Herbert.",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#1D3A2A",
    theme_color: "#1D3A2A",
    lang: "pt-BR",
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
