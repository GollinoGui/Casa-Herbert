"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import { addCashAdjustment, reverseCashAdjustment } from "@/lib/data/financials";
import {
  cancelPayable,
  createPayable,
  payPayable,
  saveRecurringBill,
  undoPayablePayment,
  updatePayable,
} from "@/lib/data/payables";
import { registerPurchase, type RegisterPurchaseInput } from "@/lib/data/purchases";
import { isKnownPayableCategory, isPaymentMethodEnabled } from "@/lib/data/finance-options";
import type { CashDirection, PaymentMethod } from "@/types";

const METHOD_OFF = "Esta forma de pagamento está desligada em Configurações. Escolha outra.";
const UNKNOWN_CATEGORY = "Categoria não encontrada. Escolha uma da lista.";

function revalidateFinancePaths() {
  for (const path of [
    "/admin",
    "/admin/financeiro",
    "/admin/contas-a-pagar",
    "/admin/compras",
    "/admin/estoque",
    "/admin/relatorios",
  ]) {
    revalidatePath(path);
  }
}

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");
const cents = z.number().int().nonnegative("Valor inválido.");

const adjustmentSchema = z.object({
  date: dateStr,
  direction: z.enum(["in", "out"]),
  amountCents: cents.positive("Informe o valor."),
  description: z.string().trim().min(2, "Descreva o ajuste.").max(140),
});

export async function addCashAdjustmentAction(input: {
  date: string;
  direction: CashDirection;
  amountCents: number;
  description: string;
}) {
  await requireAdmin();
  const parsed = adjustmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  await addCashAdjustment(parsed.data);
  revalidateFinancePaths();
  return { ok: true as const };
}

export async function reverseCashAdjustmentAction(entryId: string) {
  await requireAdmin();
  const result = await reverseCashAdjustment(entryId);
  if (result.ok) revalidateFinancePaths();
  return result;
}

const payableSchema = z.object({
  description: z.string().trim().min(2, "Descreva a conta.").max(140),
  category: z.string().trim().min(1).max(40),
  supplier: z.string().trim().max(120).nullable(),
  amountCents: cents,
  dueDate: dateStr,
  notes: z.string().trim().max(500).nullable(),
});

export async function savePayableAction(id: string | null, input: z.infer<typeof payableSchema>) {
  await requireAdmin();
  const parsed = payableSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  if (!(await isKnownPayableCategory(parsed.data.category))) return { ok: false, error: UNKNOWN_CATEGORY };
  const values = { ...parsed.data, supplier: parsed.data.supplier || null, notes: parsed.data.notes || null };
  const result = id ? await updatePayable(id, values) : (await createPayable(values), { ok: true });
  revalidateFinancePaths();
  return result;
}

export async function payPayableAction(input: { id: string; amountCents: number; method: PaymentMethod; date: string }) {
  await requireAdmin();
  if (!(await isPaymentMethodEnabled(input.method))) return { ok: false, error: METHOD_OFF };
  const result = await payPayable(input);
  if (result.ok) revalidateFinancePaths();
  return result;
}

export async function undoPayablePaymentAction(id: string) {
  await requireAdmin();
  const result = await undoPayablePayment(id);
  if (result.ok) revalidateFinancePaths();
  return result;
}

export async function cancelPayableAction(id: string) {
  await requireAdmin();
  const result = await cancelPayable(id);
  if (result.ok) revalidateFinancePaths();
  return result;
}

const recurringSchema = z.object({
  description: z.string().trim().min(2, "Descreva a conta.").max(140),
  category: z.string().trim().min(1).max(40),
  supplier: z.string().trim().max(120).nullable(),
  amountCents: cents,
  dueDay: z.number().int().min(1, "Dia entre 1 e 31.").max(31, "Dia entre 1 e 31."),
  isActive: z.boolean(),
});

export async function saveRecurringBillAction(id: string | null, input: z.infer<typeof recurringSchema>) {
  await requireAdmin();
  const parsed = recurringSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  if (!(await isKnownPayableCategory(parsed.data.category))) return { ok: false, error: UNKNOWN_CATEGORY };
  await saveRecurringBill(id, { ...parsed.data, supplier: parsed.data.supplier || null });
  revalidateFinancePaths();
  return { ok: true };
}

export async function registerPurchaseAction(input: RegisterPurchaseInput) {
  await requireAdmin();
  if (input.method && !(await isPaymentMethodEnabled(input.method))) return { ok: false, error: METHOD_OFF };
  const result = await registerPurchase(input);
  if (result.ok) revalidateFinancePaths();
  return result;
}
