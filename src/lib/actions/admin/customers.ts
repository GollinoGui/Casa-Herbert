"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import { getCustomers, updateCustomerNotes } from "@/lib/data/customers";
import { listAppointments } from "@/lib/data/appointments";

export async function updateCustomerNotesAction(id: string, notes: string) {
  await requireAdmin();
  const customer = await updateCustomerNotes(id, notes);
  revalidatePath("/admin/clientes");
  return customer;
}

export async function listCustomersAction() {
  await requireAdmin();
  return getCustomers();
}

/**
 * `listAppointments` não filtra por cliente nativamente — busca tudo e
 * filtra aqui mesmo, evitando alterar a assinatura do data layer.
 */
export async function getCustomerAppointmentsAction(customerId: string) {
  await requireAdmin();
  const all = await listAppointments();
  return all.filter((a) => a.customerId === customerId);
}
