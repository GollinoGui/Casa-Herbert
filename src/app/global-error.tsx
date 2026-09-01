"use client";

import { useEffect } from "react";

/**
 * Só entra em ação se o próprio RootLayout falhar (ex.: getSettings() lançando
 * exceção) — por isso não pode depender de dados, do CSS global nem de
 * componentes que também busquem dados. Precisa renderizar <html>/<body> próp.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#f7f3ea",
          color: "#2e2e2e",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>Não foi possível carregar a página</h1>
        <p style={{ maxWidth: "28rem", color: "#2e2e2e99", marginBottom: "1.5rem" }}>
          Ocorreu um erro inesperado. Tente novamente em instantes.
        </p>
        <button
          onClick={reset}
          style={{
            borderRadius: "9999px",
            padding: "0.75rem 1.75rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#f7f3ea",
            backgroundColor: "#2c4a3b",
            border: "none",
            cursor: "pointer",
          }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
