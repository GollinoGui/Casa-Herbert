"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import {
  payCommission,
  saveBrand,
  saveCommissionRule,
  saveProfessional,
  undoCommissionPayment,
  type CommissionKind,
} from "@/lib/data/commissions";
import { isPaymentMethodEnabled } from "@/lib/data/finance-options";
import type { Brand, CommissionScope, PaymentMethod } from "@/types";

function revalidateCommissionPaths() {
  for (const path of ["/admin", "/admin/comissoes", "/admin/financeiro", "/admin/relatorios", "/admin/estoque"]) {
    revalidatePath(path);
  }
}

export async function saveProfessionalAction(input: { id?: string; name: string; isActive: boolean }) {
  await requireAdmin();
  const result = await saveProfessional(input);
  if (result.ok) {
    revalidateCommissionPaths();
    revalidatePath("/admin/agenda");
  }
  return result;
}

export async function saveBrandAction(input: Omit<Brand, "id"> & { id?: string }) {
  await requireAdmin();
  const result = await saveBrand(input);
  if (result.ok) revalidateCommissionPaths();
  return result;
}

export async function saveCommissionRuleAction(input: {
  professionalId: string | null;
  scope: CommissionScope;
  refId: string | null;
  rateBps: number | null;
}) {
  await requireAdmin();
  const result = await saveCommissionRule(input);
  if (result.ok) revalidatePath("/admin/comissoes");
  return result;
}

export async function payCommissionAction(input: {
  kind: CommissionKind;
  refId: string;
  amountCents: number;
  method: PaymentMethod;
  date: string;
  notes?: string | null;
}) {
  await requireAdmin();
  if (!(await isPaymentMethodEnabled(input.method))) {
    return { ok: false as const, error: "Esta forma de pagamento está desligada em Configurações. Escolha outra." };
  }
  const result = await payCommission(input);
  if (result.ok) revalidateCommissionPaths();
  return result;
}

export async function undoCommissionPaymentAction(entryId: string) {
  await requireAdmin();
  const result = await undoCommissionPayment(entryId);
  if (result.ok) revalidateCommissionPaths();
  return result;
}
