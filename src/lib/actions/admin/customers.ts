"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import {
  createCustomer,
  getCustomerAppointments,
  getCustomers,
  updateCustomer,
  updateCustomerNotes,
  type SaveCustomerResult,
} from "@/lib/data/customers";
import { customerFormSchema } from "@/lib/booking/validators";

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

export async function getCustomerAppointmentsAction(customerId: string) {
  await requireAdmin();
  return getCustomerAppointments(customerId);
}

export async function saveCustomerAction(
  id: string | null,
  input: { fullName: string; phone: string; email: string }
): Promise<SaveCustomerResult> {
  await requireAdmin();
  const parsed = customerFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const values = { ...parsed.data, email: parsed.data.email || null };
  const result = id ? await updateCustomer(id, values) : await createCustomer(values);
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/agendamentos");
  revalidatePath("/admin/agenda");
  return result;
}
