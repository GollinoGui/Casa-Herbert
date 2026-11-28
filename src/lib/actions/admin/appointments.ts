"use server";

import { requireAdmin, requireStaff } from "@/lib/auth/require-admin";
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
  updateAppointmentDiscount,
  type AppointmentFilters,
} from "@/lib/data/appointments";
import { getActiveProfessionals, getAppointmentProducts, setAppointmentProducts } from "@/lib/data/professionals";
import {
  adminCreateAppointment,
  adminRescheduleAppointment,
  type AdminCreateAppointmentInput,
} from "@/lib/data/availability";
import { getDayRoute } from "@/lib/data/day-route";
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
  await requireStaff();
  return listAppointments(filters);
}

export async function getAppointmentAction(id: string): Promise<AppointmentWithRelations | null> {
  await requireStaff();
  return getAppointmentById(id);
}

export async function confirmAppointmentAction(id: string) {
  await requireStaff();
  const result = await confirmAppointment(id);
  revalidateAppointmentPaths();
  return result;
}

export async function rejectAppointmentAction(id: string, reason?: string) {
  await requireStaff();
  const result = await rejectAppointment(id, reason);
  revalidateAppointmentPaths();
  return result;
}

export async function cancelAppointmentAction(id: string, reason?: string) {
  await requireStaff();
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
  await requireStaff();
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
  const user = await requireStaff();
  // Valor, desconto e produtos são do administrador: a secretária marca com o preço do serviço.
  const allowed: AdminCreateAppointmentInput =
    user.role === "admin"
      ? input
      : { ...input, priceCentsOverride: undefined, discountCents: 0, products: [], pastVisit: false };
  const result = await adminCreateAppointment(allowed);
  revalidateAppointmentPaths();
  return result;
}

export async function adminRescheduleAppointmentAction(id: string, newDate: string, newStartTime: string) {
  await requireStaff();
  const result = await adminRescheduleAppointment(id, newDate, newStartTime);
  revalidateAppointmentPaths();
  return result;
}

export async function updateAppointmentDiscountAction(id: string, discountCents: number) {
  await requireAdmin();
  const updated = await updateAppointmentDiscount(id, discountCents);
  revalidateAppointmentPaths();
  return updated;
}

export async function getAppointmentProductsAction(appointmentId: string) {
  await requireAdmin();
  return getAppointmentProducts(appointmentId);
}

export async function setAppointmentProductsAction(
  appointmentId: string,
  lines: { productId: string; quantity: number }[]
) {
  await requireAdmin();
  await setAppointmentProducts(
    appointmentId,
    lines.filter((l) => Number.isInteger(l.quantity) && l.quantity > 0)
  );
  revalidateAppointmentPaths();
}

export async function listProfessionalsAction() {
  await requireStaff();
  return getActiveProfessionals();
}

export async function getDayRouteAction(date: string) {
  await requireStaff();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Data inválida.");
  return getDayRoute(date);
}
