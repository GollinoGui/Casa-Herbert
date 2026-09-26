"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import { checkout, listSales, type CheckoutInput } from "@/lib/data/sales";

function revalidateSalePaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/agendamentos");
  revalidatePath("/admin/estoque");
  revalidatePath("/admin/financeiro");
}

export async function checkoutAction(input: CheckoutInput) {
  await requireAdmin();
  const result = await checkout(input);
  revalidateSalePaths();
  return result;
}

export async function listSalesAction(filters?: { dateFrom?: string; dateTo?: string }) {
  await requireAdmin();
  return listSales(filters);
}
