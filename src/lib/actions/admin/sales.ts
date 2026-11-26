"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import {
  cancelSale,
  listOpenSales,
  listSales,
  receiveSalePayment,
  registerSale,
  type RegisterSaleInput,
  type SaleFilters,
} from "@/lib/data/sales";
import { isPaymentMethodEnabled } from "@/lib/data/finance-options";
import type { PaymentMethod } from "@/types";

const METHOD_OFF = "Esta forma de pagamento está desligada em Configurações. Escolha outra.";

function revalidateMoneyPaths() {
  for (const path of [
    "/admin",
    "/admin/agenda",
    "/admin/agendamentos",
    "/admin/clientes",
    "/admin/vendas",
    "/admin/estoque",
    "/admin/financeiro",
    "/admin/contas-a-receber",
    "/admin/relatorios",
  ]) {
    revalidatePath(path);
  }
}

export async function registerSaleAction(input: RegisterSaleInput) {
  await requireAdmin();
  if (input.payment && !(await isPaymentMethodEnabled(input.payment.method))) return { ok: false as const, error: METHOD_OFF };
  const result = await registerSale(input);
  if (result.ok) revalidateMoneyPaths();
  return result;
}

export async function receiveSalePaymentAction(input: {
  saleId: string;
  amountCents: number;
  method: PaymentMethod;
  date: string;
  receiptTxid?: string | null;
}) {
  await requireAdmin();
  if (!(await isPaymentMethodEnabled(input.method))) return { ok: false as const, error: METHOD_OFF };
  const result = await receiveSalePayment(input);
  if (result.ok) revalidateMoneyPaths();
  return result;
}

export async function cancelSaleAction(saleId: string, reason?: string) {
  await requireAdmin();
  const result = await cancelSale(saleId, reason);
  if (result.ok) revalidateMoneyPaths();
  return result;
}

export async function listSalesAction(filters?: SaleFilters) {
  await requireAdmin();
  return listSales(filters);
}

export async function listOpenSalesAction(customerId?: string) {
  await requireAdmin();
  return listOpenSales(customerId);
}
