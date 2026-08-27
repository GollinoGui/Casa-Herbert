"use server";

import { revalidatePath } from "next/cache";
import {
  listAppointments,
  getAppointmentById,
  confirmAppointment,
  rejectAppointment,
  cancelAppointment,
  completeAppointment,
  hydrateAppointment,
  type AppointmentFilters,
} from "@/lib/data/appointments";
import { mutateDb } from "@/lib/data/store";
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
  return listAppointments(filters);
}

export async function getAppointmentAction(id: string): Promise<AppointmentWithRelations | null> {
  return getAppointmentById(id);
}

export async function confirmAppointmentAction(id: string) {
  const result = await confirmAppointment(id);
  revalidateAppointmentPaths();
  return result;
}

export async function rejectAppointmentAction(id: string, reason?: string) {
  const result = await rejectAppointment(id, reason);
  revalidateAppointmentPaths();
  return result;
}

export async function cancelAppointmentAction(id: string, reason?: string) {
  const result = await cancelAppointment(id, reason);
  revalidateAppointmentPaths();
  return result;
}

export async function completeAppointmentAction(id: string) {
  const result = await completeAppointment(id);
  revalidateAppointmentPaths();
  return result;
}

/**
 * Não há um `updateAdminNotes` dedicado em lib/data/appointments.ts — a
 * mutação é feita aqui mesmo, reaproveitando `mutateDb`/`hydrateAppointment`
 * já exportados por aquele módulo, para não precisar tocar em código fora do
 * escopo do painel admin.
 */
export async function updateAdminNotesAction(
  id: string,
  notes: string
): Promise<AppointmentWithRelations | null> {
  const updated = mutateDb((db) => {
    const appointment = db.appointments.find((a) => a.id === id);
    if (!appointment) return null;
    appointment.adminNotes = notes;
    appointment.updatedAt = new Date().toISOString();
    return hydrateAppointment(appointment, db);
  });
  revalidateAppointmentPaths();
  return updated;
}
