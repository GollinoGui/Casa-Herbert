"use server";

import { revalidatePath } from "next/cache";
import { updateCustomerNotes } from "@/lib/data/customers";
import { listAppointments } from "@/lib/data/appointments";

export async function updateCustomerNotesAction(id: string, notes: string) {
  const customer = await updateCustomerNotes(id, notes);
  revalidatePath("/admin/clientes");
  return customer;
}

/**
 * `listAppointments` não filtra por cliente nativamente — busca tudo e
 * filtra aqui mesmo, evitando alterar a assinatura do data layer.
 */
export async function getCustomerAppointmentsAction(customerId: string) {
  const all = await listAppointments();
  return all.filter((a) => a.customerId === customerId);
}
