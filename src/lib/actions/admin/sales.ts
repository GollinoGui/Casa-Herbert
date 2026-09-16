"use server";

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
  const result = await checkout(input);
  revalidateSalePaths();
  return result;
}

export async function listSalesAction(filters?: { dateFrom?: string; dateTo?: string }) {
  return listSales(filters);
}
