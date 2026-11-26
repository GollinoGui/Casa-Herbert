/** Centavos → "R$ 1.234,56". Diferente de formatServicePrice: aqui não existe "sob consulta". */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "1.234,56", "1234.56", "R$ 50" → centavos; null se não for um valor. */
export function parseBRL(text: string): number | null {
  const cleaned = text.replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;
  // Com vírgula, ela é o separador decimal (formato brasileiro) e os pontos são milhar.
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}
