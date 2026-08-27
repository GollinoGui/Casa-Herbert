/** Formata a duração de um serviço para exibição: "30 min", "1h", "1h30". */
export function formatServiceDuration(durationMinutes: number): string {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${minutes.toString().padStart(2, "0")}`;
}

/** Formata o preço de um serviço em centavos para BRL, ou "Sob consulta" quando não definido. */
export function formatServicePrice(priceCents: number | null): string {
  if (priceCents == null) return "Sob consulta";
  return (priceCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
