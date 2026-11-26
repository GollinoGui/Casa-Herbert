import { buildWhatsAppLink } from "@/lib/booking/whatsapp";
import { formatBRL } from "@/lib/utils/money";
import { formatShortDatePtBR } from "@/lib/utils/date-format";
import type { Sale } from "@/types";

export function openAmount(sale: Sale) {
  return sale.totalCents - sale.paidCents;
}

/** Mensagem de cobrança gentil, com o que ficou em aberto. Um ou vários itens do mesmo cliente. */
export function buildChargeLink(phone: string, customerName: string, sales: Sale[]) {
  const firstName = customerName.trim().split(/\s+/)[0] ?? "";
  const total = sales.reduce((s, sale) => s + openAmount(sale), 0);
  const lines = sales.map(
    (sale) =>
      `• ${sale.items.map((i) => `${i.description}${i.quantity > 1 ? ` (${i.quantity}x)` : ""}`).join(", ")} — ${formatShortDatePtBR(sale.saleDate)}: ${formatBRL(openAmount(sale))}`
  );
  const message = [
    `Olá, ${firstName}! Tudo bem? Aqui é da Casa Herbert.`,
    `Passando para lembrar que ficou em aberto:`,
    ...lines,
    sales.length > 1 ? `Total: ${formatBRL(total)}` : null,
    `Pode pagar por Pix ou na sua próxima visita. Qualquer dúvida, é só chamar. Obrigado!`,
  ]
    .filter(Boolean)
    .join("\n");
  return buildWhatsAppLink(phone, message);
}
