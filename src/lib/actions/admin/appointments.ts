"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import {
  listAppointments,
  getAppointmentById,
  confirmAppointment,
  rejectAppointment,
  cancelAppointment,
  completeAppointment,
  updateAppointmentAdminNotes,
  updateAppointmentPrice,
  type AppointmentFilters,
} from "@/lib/data/appointments";
import {
  adminCreateAppointment,
  adminRescheduleAppointment,
  type AdminCreateAppointmentInput,
} from "@/lib/data/availability";
import type { AppointmentWithRelations } from "@/types";

function revalidateAppointmentPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/agendamentos");
  revalidatePath("/admin/clientes");
}

export async function listAppointmentsAction(
  filters?: AppointmentFilters
): Promise<AppointmentWithRelations[]> {
  await requireAdmin();
  return listAppointments(filters);
}

export async function getAppointmentAction(id: string): Promise<AppointmentWithRelations | null> {
  await requireAdmin();
  return getAppointmentById(id);
}

export async function confirmAppointmentAction(id: string) {
  await requireAdmin();
  const result = await confirmAppointment(id);
  revalidateAppointmentPaths();
  return result;
}

export async function rejectAppointmentAction(id: string, reason?: string) {
  await requireAdmin();
  const result = await rejectAppointment(id, reason);
  revalidateAppointmentPaths();
  return result;
}

export async function cancelAppointmentAction(id: string, reason?: string) {
  await requireAdmin();
  const result = await cancelAppointment(id, reason);
  revalidateAppointmentPaths();
  return result;
}

export async function completeAppointmentAction(id: string) {
  await requireAdmin();
  const result = await completeAppointment(id);
  revalidateAppointmentPaths();
  return result;
}

export async function updateAdminNotesAction(
  id: string,
  notes: string
): Promise<AppointmentWithRelations | null> {
  await requireAdmin();
  const updated = await updateAppointmentAdminNotes(id, notes);
  revalidateAppointmentPaths();
  return updated;
}

export async function updateAppointmentPriceAction(
  id: string,
  priceCents: number | null
): Promise<AppointmentWithRelations | null> {
  await requireAdmin();
  const updated = await updateAppointmentPrice(id, priceCents);
  revalidateAppointmentPaths();
  return updated;
}

export async function adminCreateAppointmentAction(input: AdminCreateAppointmentInput) {
  await requireAdmin();
  const result = await adminCreateAppointment(input);
  revalidateAppointmentPaths();
  return result;
}

export async function adminRescheduleAppointmentAction(id: string, newDate: string, newStartTime: string) {
  await requireAdmin();
  const result = await adminRescheduleAppointment(id, newDate, newStartTime);
  revalidateAppointmentPaths();
  return result;
}
