"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import type { ReceiptData } from "@/lib/receipts/parse-receipt";
import { getCustomers } from "@/lib/data/customers";
import { getActiveProducts } from "@/lib/data/products";
import { getActiveServices } from "@/lib/data/services";
import { listOpenSales } from "@/lib/data/sales";
import { listAppointments } from "@/lib/data/appointments";
import { todayDateStr } from "@/lib/utils/date-format";
import type { AppointmentWithRelations, Customer, Product, Sale, Service } from "@/types";

export interface ReceiptSuggestions {
  customers: Customer[];
  /** Produto cujo preço (ou múltiplo de até 5 unidades) bate com o valor. */
  products: { product: Product; quantity: number }[];
  services: Service[];
  /** Pendências cujo valor que falta bate — provavelmente o cliente pagando uma dívida. */
  openSales: Sale[];
  /** Atendimentos de hoje (confirmados) cujo valor bate. */
  appointments: AppointmentWithRelations[];
}

export type ReadReceiptActionResult =
  | { ok: true; data: ReceiptData; suggestions: ReceiptSuggestions }
  | { ok: false; error: string };

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/** Quantas palavras do nome no comprovante aparecem no nome do cadastro (comprovante às vezes abrevia/mascara). */
function nameScore(payer: string, customer: string) {
  const payerTokens = normalize(payer);
  const customerTokens = new Set(normalize(customer));
  if (payerTokens.length === 0) return 0;
  const hits = payerTokens.filter((t) => customerTokens.has(t)).length;
  // primeiro nome igual vale mais
  return hits + (payerTokens[0] && customerTokens.has(payerTokens[0]) ? 0.5 : 0);
}

/**
 * O texto do comprovante é lido no navegador (src/lib/receipts); aqui só cruzamos os
 * campos com o cadastro para sugerir cliente e o que foi pago.
 */
export async function suggestReceiptMatchesAction(data: ReceiptData): Promise<ReadReceiptActionResult> {
  await requireAdmin();
  const read = {
    data: {
      ...data,
      amountCents: Number.isInteger(data.amountCents) && (data.amountCents ?? 0) > 0 ? data.amountCents : null,
      payerName: typeof data.payerName === "string" ? data.payerName.slice(0, 120) : null,
    },
  };
  const amount = read.data.amountCents;
  const [customers, products, services, openSales, todayAppointments] = await Promise.all([
    getCustomers(),
    getActiveProducts(),
    getActiveServices(),
    listOpenSales(),
    listAppointments({ dateFrom: todayDateStr(), dateTo: todayDateStr(), status: ["CONFIRMED"] }),
  ]);

  const matchedCustomers = read.data.payerName
    ? customers
        .map((c) => ({ c, score: nameScore(read.data.payerName!, c.fullName) }))
        .filter((x) => x.score >= 1)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((x) => x.c)
    : [];
  const customerIds = new Set(matchedCustomers.map((c) => c.id));

  const productMatches: ReceiptSuggestions["products"] = [];
  if (amount) {
    for (const product of products) {
      if (product.priceCents <= 0 || amount % product.priceCents !== 0) continue;
      const quantity = amount / product.priceCents;
      if (quantity <= 5 && quantity <= Math.max(product.stockQuantity, 1)) productMatches.push({ product, quantity });
    }
    productMatches.sort((a, b) => a.quantity - b.quantity);
  }

  const remaining = (s: Sale) => s.totalCents - s.paidCents;
  const appointmentValue = (a: AppointmentWithRelations) => (a.priceCents ?? 0) - a.discountCents;

  return {
    ok: true,
    data: read.data,
    suggestions: {
      customers: matchedCustomers,
      products: productMatches.slice(0, 5),
      services: amount ? services.filter((s) => s.priceCents === amount).slice(0, 5) : [],
      // Dívida do próprio pagador primeiro; de outros só se o valor bater exato.
      openSales: openSales
        .filter((s) => (amount ? remaining(s) === amount || (s.customerId && customerIds.has(s.customerId)) : false))
        .sort((a, b) => Number(!!b.customerId && customerIds.has(b.customerId)) - Number(!!a.customerId && customerIds.has(a.customerId)))
        .slice(0, 5),
      appointments: todayAppointments
        .filter((a) => customerIds.has(a.customerId) || (amount != null && appointmentValue(a) === amount))
        .slice(0, 5),
    },
  };
}
