import type { Appointment, AppointmentStatus, AppointmentWithRelations } from "@/types";
import { mutateDb, readDb } from "./store";
import type { MockDatabase } from "./seed-data";

export function hydrateAppointment(
  appointment: Appointment,
  db: MockDatabase
): AppointmentWithRelations | null {
  const customer = db.customers.find((c) => c.id === appointment.customerId);
  const service = db.services.find((s) => s.id === appointment.serviceId);
  if (!customer || !service) return null;
  return { ...appointment, customer, service };
}

export interface AppointmentFilters {
  status?: AppointmentStatus[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export async function listAppointments(filters: AppointmentFilters = {}): Promise<AppointmentWithRelations[]> {
  const db = readDb();
  let items = db.appointments;

  if (filters.status?.length) {
    items = items.filter((a) => filters.status!.includes(a.status));
  }
  if (filters.dateFrom) {
    items = items.filter((a) => a.date >= filters.dateFrom!);
  }
  if (filters.dateTo) {
    items = items.filter((a) => a.date <= filters.dateTo!);
  }

  const hydrated = items
    .map((a) => hydrateAppointment(a, db))
    .filter((a): a is AppointmentWithRelations => a !== null);

  const search = filters.search?.trim().toLowerCase();
  const filtered = search
    ? hydrated.filter(
        (a) =>
          a.customer.fullName.toLowerCase().includes(search) ||
          a.customer.phone.includes(search) ||
          a.service.name.toLowerCase().includes(search)
      )
    : hydrated;

  return filtered.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

export async function getAppointmentById(id: string): Promise<AppointmentWithRelations | null> {
  const db = readDb();
  const appointment = db.appointments.find((a) => a.id === id);
  if (!appointment) return null;
  return hydrateAppointment(appointment, db);
}

function touch(appointment: Appointment) {
  appointment.updatedAt = new Date().toISOString();
}

export async function confirmAppointment(id: string): Promise<AppointmentWithRelations | null> {
  return mutateDb((db) => {
    const appointment = db.appointments.find((a) => a.id === id);
    if (!appointment || appointment.status !== "PENDING") return null;
    appointment.status = "CONFIRMED";
    appointment.confirmedAt = new Date().toISOString();
    touch(appointment);
    return hydrateAppointment(appointment, db);
  });
}

export async function rejectAppointment(id: string, reason?: string): Promise<AppointmentWithRelations | null> {
  return mutateDb((db) => {
    const appointment = db.appointments.find((a) => a.id === id);
    if (!appointment || appointment.status !== "PENDING") return null;
    appointment.status = "REJECTED";
    appointment.cancelledAt = new Date().toISOString();
    if (reason) appointment.adminNotes = reason;
    touch(appointment);
    return hydrateAppointment(appointment, db);
  });
}

export async function cancelAppointment(id: string, reason?: string): Promise<AppointmentWithRelations | null> {
  return mutateDb((db) => {
    const appointment = db.appointments.find((a) => a.id === id);
    if (!appointment || (appointment.status !== "PENDING" && appointment.status !== "CONFIRMED")) return null;
    appointment.status = "CANCELLED";
    appointment.cancelledAt = new Date().toISOString();
    if (reason) appointment.adminNotes = reason;
    touch(appointment);
    return hydrateAppointment(appointment, db);
  });
}

export async function completeAppointment(id: string): Promise<AppointmentWithRelations | null> {
  return mutateDb((db) => {
    const appointment = db.appointments.find((a) => a.id === id);
    if (!appointment || appointment.status !== "CONFIRMED") return null;
    appointment.status = "COMPLETED";
    touch(appointment);
    return hydrateAppointment(appointment, db);
  });
}

export async function getDashboardStats() {
  const db = readDb();
  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const todayAppointments = db.appointments.filter((a) => a.date === today && a.status !== "CANCELLED" && a.status !== "REJECTED");
  const pending = db.appointments.filter((a) => a.status === "PENDING");
  const confirmed = db.appointments.filter((a) => a.status === "CONFIRMED");
  const upcoming = db.appointments
    .filter((a) => a.date >= today && (a.status === "PENDING" || a.status === "CONFIRMED"))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    .slice(0, 6)
    .map((a) => hydrateAppointment(a, db))
    .filter((a): a is AppointmentWithRelations => a !== null);
  const thisWeek = db.appointments.filter((a) => a.date >= today && a.date <= in7 && a.status !== "CANCELLED" && a.status !== "REJECTED");
  const thisMonth = db.appointments.filter((a) => a.date >= today && a.date <= in30 && a.status !== "CANCELLED" && a.status !== "REJECTED");

  return {
    todayCount: todayAppointments.length,
    pendingCount: pending.length,
    confirmedCount: confirmed.length,
    weekCount: thisWeek.length,
    monthCount: thisMonth.length,
    upcoming,
    todayAppointments: todayAppointments
      .map((a) => hydrateAppointment(a, db))
      .filter((a): a is AppointmentWithRelations => a !== null)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  };
}
