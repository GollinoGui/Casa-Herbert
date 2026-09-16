import type { AppointmentStatus, AppointmentWithRelations, AvailabilityResult } from "@/types";
import { bookingRequestSchema, type BookingRequestInput } from "@/lib/booking/validators";
import { getAvailableSlots as computeAvailableSlots, type BusyInterval } from "@/lib/booking/engine";
import { addDaysToDateStr } from "@/lib/utils/date-format";
import { mutateDb, readDb } from "./store";
import type { MockDatabase } from "./seed-data";
import { findOrCreateCustomer } from "./customers";
import { hydrateAppointment } from "./appointments";
import { randomUUID } from "node:crypto";

/**
 * Espelha a futura RPC `get_available_slots(date, service_id)`. Toda a regra
 * vive em lib/booking/engine.ts — este módulo só busca os dados brutos.
 */
export async function getAvailableSlotsForService(
  dateStr: string,
  serviceId: string
): Promise<AvailabilityResult> {
  const db = readDb();
  const service = db.services.find((s) => s.id === serviceId && s.isActive);
  if (!service) {
    return { bookable: false, reason: "CLOSED", slots: [] };
  }

  const activeAppointments: BusyInterval[] = db.appointments
    .filter((a) => a.date === dateStr && (a.status === "PENDING" || a.status === "CONFIRMED"))
    .map((a) => ({ startTime: a.startTime, endTime: a.endTime }));

  return computeAvailableSlots({
    dateStr,
    durationMinutes: service.durationMinutes,
    businessHours: db.businessHours,
    specialHours: db.specialHours,
    blockedSlots: db.blockedSlots,
    activeAppointments,
    settings: db.settings,
  });
}

const NEXT_AVAILABLE_SEARCH_DAYS = 60;

/**
 * Procura, a partir de (e incluindo) `fromDateStr`, a primeira data com horário livre —
 * reaproveita getAvailableSlotsForService dia a dia (mesma regra, sem duplicar nada).
 * Só serve de sugestão de UX; a data escolhida ainda passa pela revalidação normal.
 */
export async function findNextAvailableDate(
  fromDateStr: string,
  serviceId: string
): Promise<string | null> {
  let candidate = fromDateStr;
  for (let i = 0; i < NEXT_AVAILABLE_SEARCH_DAYS; i++) {
    const result = await getAvailableSlotsForService(candidate, serviceId);
    if (result.bookable) return candidate;
    candidate = addDaysToDateStr(candidate, 1);
  }
  return null;
}

export type CreateAppointmentResult =
  | { ok: true; appointment: AppointmentWithRelations }
  | { ok: false; error: string };

/**
 * Espelha a futura RPC `create_appointment(...)` (SECURITY DEFINER). Revalida
 * tudo do zero no "servidor" — nunca confia no que o client mostrou antes.
 * No Postgres real, a constraint EXCLUDE é quem garante atomicidade sob
 * concorrência; aqui, a checagem-e-escrita síncrona dentro de mutateDb cumpre
 * o mesmo papel para um único processo de dev.
 */
export async function createAppointment(rawInput: BookingRequestInput): Promise<CreateAppointmentResult> {
  const parsed = bookingRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const input = parsed.data;

  const customer = await findOrCreateCustomer({
    fullName: input.customerName,
    phone: input.customerPhone,
    email: input.customerEmail || null,
  });

  return mutateDb((db) => {
    const service = db.services.find((s) => s.id === input.serviceId && s.isActive);
    if (!service) return { ok: false, error: "Serviço indisponível." };

    const activeAppointments: BusyInterval[] = db.appointments
      .filter((a) => a.date === input.date && (a.status === "PENDING" || a.status === "CONFIRMED"))
      .map((a) => ({ startTime: a.startTime, endTime: a.endTime }));

    const availability = computeAvailableSlots({
      dateStr: input.date,
      durationMinutes: service.durationMinutes,
      businessHours: db.businessHours,
      specialHours: db.specialHours,
      blockedSlots: db.blockedSlots,
      activeAppointments,
      settings: db.settings,
    });

    const stillAvailable = availability.slots.some((s) => s.startTime === input.startTime);
    if (!stillAvailable) {
      return { ok: false, error: "SLOT_NO_LONGER_AVAILABLE" };
    }

    const endMinutes = timeToMinutesLocal(input.startTime) + service.durationMinutes;
    const now = new Date().toISOString();
    const appointment = {
      id: randomUUID(),
      customerId: customer.id,
      serviceId: service.id,
      date: input.date,
      startTime: input.startTime,
      endTime: minutesToTimeLocal(endMinutes),
      status: "PENDING" as const,
      customerNotes: input.notes || null,
      adminNotes: null,
      priceCents: service.priceCents,
      createdAt: now,
      updatedAt: now,
      confirmedAt: null,
      cancelledAt: null,
    };
    db.appointments.push(appointment);

    const hydrated = hydrateAppointment(appointment, db);
    if (!hydrated) return { ok: false, error: "Erro inesperado ao criar agendamento." };
    return { ok: true, appointment: hydrated };
  });
}

export async function rescheduleAppointment(
  id: string,
  newDate: string,
  newStartTime: string
): Promise<CreateAppointmentResult> {
  return mutateDb((db) => {
    const appointment = db.appointments.find((a) => a.id === id);
    if (!appointment) return { ok: false, error: "Agendamento não encontrado." };
    const service = db.services.find((s) => s.id === appointment.serviceId);
    if (!service) return { ok: false, error: "Serviço indisponível." };

    const activeAppointments: BusyInterval[] = db.appointments
      .filter(
        (a) => a.id !== id && a.date === newDate && (a.status === "PENDING" || a.status === "CONFIRMED")
      )
      .map((a) => ({ startTime: a.startTime, endTime: a.endTime }));

    const availability = computeAvailableSlots({
      dateStr: newDate,
      durationMinutes: service.durationMinutes,
      businessHours: db.businessHours,
      specialHours: db.specialHours,
      blockedSlots: db.blockedSlots,
      activeAppointments,
      settings: db.settings,
    });

    const stillAvailable = availability.slots.some((s) => s.startTime === newStartTime);
    if (!stillAvailable) return { ok: false, error: "SLOT_NO_LONGER_AVAILABLE" };

    const endMinutes = timeToMinutesLocal(newStartTime) + service.durationMinutes;
    appointment.date = newDate;
    appointment.startTime = newStartTime;
    appointment.endTime = minutesToTimeLocal(endMinutes);
    appointment.status = "PENDING";
    appointment.confirmedAt = null;
    appointment.updatedAt = new Date().toISOString();

    const hydrated = hydrateAppointment(appointment, db);
    if (!hydrated) return { ok: false, error: "Erro inesperado ao reagendar." };
    return { ok: true, appointment: hydrated };
  });
}

/**
 * Checagem de disponibilidade reaproveitada pelas duas funções administrativas abaixo.
 * Ignora `minAdvanceDays` de propósito — agendamento manual/walk-in feito pelo próprio
 * Herbert não precisa respeitar a antecedência mínima pensada pro cliente no site público
 * (mas continua respeitando data passada, dias fechados, buffer e conflito de horário,
 * que vêm do mesmo lib/booking/engine.ts inalterado).
 */
function checkAdminSlotFree(
  db: MockDatabase,
  params: { date: string; startTime: string; endTime: string; durationMinutes: number; excludeAppointmentId?: string }
): { ok: true } | { ok: false; error: string } {
  const activeAppointments: BusyInterval[] = db.appointments
    .filter(
      (a) =>
        a.date === params.date &&
        a.id !== params.excludeAppointmentId &&
        (a.status === "PENDING" || a.status === "CONFIRMED")
    )
    .map((a) => ({ startTime: a.startTime, endTime: a.endTime }));

  const availability = computeAvailableSlots({
    dateStr: params.date,
    durationMinutes: params.durationMinutes,
    businessHours: db.businessHours,
    specialHours: db.specialHours,
    blockedSlots: db.blockedSlots,
    activeAppointments,
    settings: { ...db.settings, minAdvanceDays: 0 },
  });

  const stillAvailable = availability.slots.some((s) => s.startTime === params.startTime);
  return stillAvailable ? { ok: true } : { ok: false, error: "SLOT_NO_LONGER_AVAILABLE" };
}

export interface AdminCreateAppointmentInput {
  serviceId: string;
  date: string;
  startTime: string;
  priceCentsOverride?: number | null;
  customerId?: string;
  newCustomer?: { fullName: string; phone: string; email?: string | null };
  adminNotes?: string | null;
  status?: Extract<AppointmentStatus, "PENDING" | "CONFIRMED">;
}

/**
 * Cria um agendamento diretamente pelo admin (ex: cliente que liga ou aparece sem ter
 * passado pelo fluxo público). Diferente de createAppointment(): aceita cliente novo ou
 * existente, preço combinado na hora, e status inicial (default CONFIRMED — é o próprio
 * Herbert confirmando, não faz sentido nascer PENDING esperando confirmação dele mesmo).
 */
export async function adminCreateAppointment(input: AdminCreateAppointmentInput): Promise<CreateAppointmentResult> {
  let customerId = input.customerId;
  if (!customerId && input.newCustomer) {
    const customer = await findOrCreateCustomer(input.newCustomer);
    customerId = customer.id;
  }
  if (!customerId) {
    return { ok: false, error: "Selecione um cliente ou informe os dados de um novo cliente." };
  }
  const resolvedCustomerId = customerId;

  return mutateDb((db) => {
    const customer = db.customers.find((c) => c.id === resolvedCustomerId);
    if (!customer) return { ok: false, error: "Cliente não encontrado." };

    const service = db.services.find((s) => s.id === input.serviceId && s.isActive);
    if (!service) return { ok: false, error: "Serviço indisponível." };

    const endMinutes = timeToMinutesLocal(input.startTime) + service.durationMinutes;
    const endTime = minutesToTimeLocal(endMinutes);

    const check = checkAdminSlotFree(db, {
      date: input.date,
      startTime: input.startTime,
      endTime,
      durationMinutes: service.durationMinutes,
    });
    if (!check.ok) return check;

    const now = new Date().toISOString();
    const status = input.status ?? "CONFIRMED";
    const appointment = {
      id: randomUUID(),
      customerId: resolvedCustomerId,
      serviceId: service.id,
      date: input.date,
      startTime: input.startTime,
      endTime,
      status,
      customerNotes: null,
      adminNotes: input.adminNotes || null,
      priceCents: input.priceCentsOverride !== undefined ? input.priceCentsOverride : service.priceCents,
      createdAt: now,
      updatedAt: now,
      confirmedAt: status === "CONFIRMED" ? now : null,
      cancelledAt: null,
    };
    db.appointments.push(appointment);

    const hydrated = hydrateAppointment(appointment, db);
    if (!hydrated) return { ok: false, error: "Erro inesperado ao criar agendamento." };
    return { ok: true, appointment: hydrated };
  });
}

/**
 * Reagenda pelo admin (drag no calendário). Diferente de rescheduleAppointment(): não
 * reseta o status para PENDING nem zera confirmedAt — é o próprio Herbert reorganizando
 * a agenda, não o cliente pedindo um novo horário que precisa ser reconfirmado.
 */
export async function adminRescheduleAppointment(
  id: string,
  newDate: string,
  newStartTime: string
): Promise<CreateAppointmentResult> {
  return mutateDb((db) => {
    const appointment = db.appointments.find((a) => a.id === id);
    if (!appointment) return { ok: false, error: "Agendamento não encontrado." };
    if (appointment.status !== "PENDING" && appointment.status !== "CONFIRMED") {
      return { ok: false, error: "Só é possível reagendar agendamentos pendentes ou confirmados." };
    }
    const service = db.services.find((s) => s.id === appointment.serviceId);
    if (!service) return { ok: false, error: "Serviço indisponível." };

    const endMinutes = timeToMinutesLocal(newStartTime) + service.durationMinutes;
    const endTime = minutesToTimeLocal(endMinutes);

    const check = checkAdminSlotFree(db, {
      date: newDate,
      startTime: newStartTime,
      endTime,
      durationMinutes: service.durationMinutes,
      excludeAppointmentId: id,
    });
    if (!check.ok) return check;

    appointment.date = newDate;
    appointment.startTime = newStartTime;
    appointment.endTime = endTime;
    appointment.updatedAt = new Date().toISOString();

    const hydrated = hydrateAppointment(appointment, db);
    if (!hydrated) return { ok: false, error: "Erro inesperado ao reagendar." };
    return { ok: true, appointment: hydrated };
  });
}

function timeToMinutesLocal(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTimeLocal(total: number): string {
  const h = Math.floor(total / 60).toString().padStart(2, "0");
  const m = (total % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}
