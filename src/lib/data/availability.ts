import type {
  AppointmentStatus,
  AppointmentWithRelations,
  AvailabilityResult,
  BlockedSlot,
  BusinessHourRule,
  Service,
  Settings,
  SpecialHours,
} from "@/types";
import { bookingRequestSchema, type BookingRequestInput } from "@/lib/booking/validators";
import { getAvailableSlots as computeAvailableSlots, type BusyInterval } from "@/lib/booking/engine";
import { addDaysToDateStr, addMinutesToTime } from "@/lib/utils/date-format";
import { getSupabase, PG_EXCLUSION_VIOLATION, unwrap } from "@/lib/supabase/server";
import {
  APPOINTMENT_WITH_RELATIONS,
  hhmm,
  toAppointmentWithRelations,
  toBlockedSlot,
  toBusinessHour,
  toService,
  toSettings,
  toSpecialHours,
} from "@/lib/supabase/mappers";
import { findOrCreateCustomer } from "./customers";

/** Tudo que o engine precisa para calcular qualquer dia dentro de [dateFrom, dateTo], buscado de uma vez. */
interface BookingContext {
  settings: Settings;
  businessHours: BusinessHourRule[];
  specialHours: SpecialHours[];
  blockedSlots: BlockedSlot[];
  appointments: { id: string; date: string; startTime: string; endTime: string }[];
}

async function loadBookingContext(dateFrom: string, dateTo: string): Promise<BookingContext> {
  const supabase = getSupabase();
  const [settings, businessHours, specialHours, blockedSlots, appointments] = await Promise.all([
    supabase.from("settings").select("*").eq("id", 1).single(),
    supabase.from("business_hours").select("*").eq("is_active", true),
    supabase
      .from("special_hours")
      .select("*, special_hours_ranges(*)")
      .gte("special_date", dateFrom)
      .lte("special_date", dateTo),
    supabase.from("blocked_slots").select("*").lte("start_date", dateTo).gte("end_date", dateFrom),
    supabase
      .from("appointments")
      .select("id, appointment_date, start_time, end_time")
      .gte("appointment_date", dateFrom)
      .lte("appointment_date", dateTo)
      .in("status", ["PENDING", "CONFIRMED"]),
  ]);

  return {
    settings: toSettings(unwrap(settings)),
    businessHours: unwrap(businessHours).map(toBusinessHour),
    specialHours: unwrap(specialHours).map(toSpecialHours),
    blockedSlots: unwrap(blockedSlots).map(toBlockedSlot),
    appointments: unwrap(appointments).map((a) => ({
      id: a.id as string,
      date: a.appointment_date as string,
      startTime: hhmm(a.start_time as string),
      endTime: hhmm(a.end_time as string),
    })),
  };
}

function computeForDate(
  ctx: BookingContext,
  dateStr: string,
  durationMinutes: number,
  options: { excludeAppointmentId?: string; ignoreMinAdvance?: boolean } = {}
): AvailabilityResult {
  const activeAppointments: BusyInterval[] = ctx.appointments
    .filter((a) => a.date === dateStr && a.id !== options.excludeAppointmentId)
    .map((a) => ({ startTime: a.startTime, endTime: a.endTime }));

  return computeAvailableSlots({
    dateStr,
    durationMinutes,
    businessHours: ctx.businessHours,
    specialHours: ctx.specialHours,
    blockedSlots: ctx.blockedSlots,
    activeAppointments,
    settings: options.ignoreMinAdvance ? { ...ctx.settings, minAdvanceDays: 0 } : ctx.settings,
  });
}

async function getActiveService(serviceId: string): Promise<Service | null> {
  const row = unwrap(
    await getSupabase().from("services").select("*").eq("id", serviceId).eq("is_active", true).maybeSingle()
  );
  return row ? toService(row) : null;
}

/**
 * Espelha a RPC `get_available_slots(date, service_id)`. Toda a regra
 * vive em lib/booking/engine.ts — este módulo só busca os dados brutos.
 */
export async function getAvailableSlotsForService(
  dateStr: string,
  serviceId: string
): Promise<AvailabilityResult> {
  const [service, ctx] = await Promise.all([getActiveService(serviceId), loadBookingContext(dateStr, dateStr)]);
  if (!service) {
    return { bookable: false, reason: "CLOSED", slots: [] };
  }
  return computeForDate(ctx, dateStr, service.durationMinutes);
}

const NEXT_AVAILABLE_SEARCH_DAYS = 60;

/**
 * Procura, a partir de (e incluindo) `fromDateStr`, a primeira data com horário livre —
 * mesma regra do engine aplicada dia a dia sobre um único carregamento do período.
 * Só serve de sugestão de UX; a data escolhida ainda passa pela revalidação normal.
 */
export async function findNextAvailableDate(
  fromDateStr: string,
  serviceId: string
): Promise<string | null> {
  const lastDate = addDaysToDateStr(fromDateStr, NEXT_AVAILABLE_SEARCH_DAYS - 1);
  const [service, ctx] = await Promise.all([getActiveService(serviceId), loadBookingContext(fromDateStr, lastDate)]);
  if (!service) return null;

  let candidate = fromDateStr;
  for (let i = 0; i < NEXT_AVAILABLE_SEARCH_DAYS; i++) {
    if (computeForDate(ctx, candidate, service.durationMinutes).bookable) return candidate;
    candidate = addDaysToDateStr(candidate, 1);
  }
  return null;
}

export type CreateAppointmentResult =
  | { ok: true; appointment: AppointmentWithRelations }
  | { ok: false; error: string };

const SLOT_TAKEN: CreateAppointmentResult = { ok: false, error: "SLOT_NO_LONGER_AVAILABLE" };

/**
 * A checagem do engine acontece antes, mas quem garante de verdade sob concorrência é o
 * banco: EXCLUDE em appointments (sobreposição) e o trigger SLOT_BLOCKED (bloqueio manual).
 */
function isSlotConflictError(error: { code?: string; message?: string } | null): boolean {
  return !!error && (error.code === PG_EXCLUSION_VIOLATION || !!error.message?.includes("SLOT_BLOCKED"));
}

/**
 * Espelha a RPC `create_appointment(...)`. Revalida tudo do zero no servidor —
 * nunca confia no que o client mostrou antes.
 */
export async function createAppointment(rawInput: BookingRequestInput): Promise<CreateAppointmentResult> {
  const parsed = bookingRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const input = parsed.data;

  const [service, ctx] = await Promise.all([
    getActiveService(input.serviceId),
    loadBookingContext(input.date, input.date),
  ]);
  if (!service) return { ok: false, error: "Serviço indisponível." };

  const availability = computeForDate(ctx, input.date, service.durationMinutes);
  if (!availability.slots.some((s) => s.startTime === input.startTime)) return SLOT_TAKEN;

  const customer = await findOrCreateCustomer({
    fullName: input.customerName,
    phone: input.customerPhone,
    email: input.customerEmail || null,
  });

  return insertAppointment({
    customer_id: customer.id,
    service_id: service.id,
    appointment_date: input.date,
    start_time: input.startTime,
    end_time: addMinutesToTime(input.startTime, service.durationMinutes),
    status: "PENDING",
    customer_notes: input.notes || null,
    price_cents: service.priceCents,
  });
}

async function insertAppointment(row: Record<string, unknown>): Promise<CreateAppointmentResult> {
  const result = await getSupabase().from("appointments").insert(row).select(APPOINTMENT_WITH_RELATIONS).single();
  if (isSlotConflictError(result.error)) return SLOT_TAKEN;
  return { ok: true, appointment: toAppointmentWithRelations(unwrap(result)) };
}

async function moveAppointment(id: string, changes: Record<string, unknown>): Promise<CreateAppointmentResult> {
  const result = await getSupabase()
    .from("appointments")
    .update(changes)
    .eq("id", id)
    .select(APPOINTMENT_WITH_RELATIONS)
    .single();
  if (isSlotConflictError(result.error)) return SLOT_TAKEN;
  return { ok: true, appointment: toAppointmentWithRelations(unwrap(result)) };
}

async function getAppointmentForMove(
  id: string
): Promise<{ status: AppointmentStatus; service: Service } | null> {
  const row = unwrap(
    await getSupabase().from("appointments").select("status, service:services(*)").eq("id", id).maybeSingle()
  );
  if (!row) return null;
  return { status: row.status as AppointmentStatus, service: toService(row.service) };
}

export async function rescheduleAppointment(
  id: string,
  newDate: string,
  newStartTime: string
): Promise<CreateAppointmentResult> {
  const [appointment, ctx] = await Promise.all([getAppointmentForMove(id), loadBookingContext(newDate, newDate)]);
  if (!appointment) return { ok: false, error: "Agendamento não encontrado." };

  const availability = computeForDate(ctx, newDate, appointment.service.durationMinutes, { excludeAppointmentId: id });
  if (!availability.slots.some((s) => s.startTime === newStartTime)) return SLOT_TAKEN;

  return moveAppointment(id, {
    appointment_date: newDate,
    start_time: newStartTime,
    end_time: addMinutesToTime(newStartTime, appointment.service.durationMinutes),
    status: "PENDING",
    confirmed_at: null,
  });
}

/*
 * As duas funções administrativas abaixo ignoram `minAdvanceDays` de propósito —
 * agendamento manual/walk-in feito pelo próprio Herbert não precisa respeitar a
 * antecedência mínima pensada pro cliente no site público (mas continua respeitando
 * data passada, dias fechados, buffer e conflito de horário, que vêm do mesmo
 * lib/booking/engine.ts inalterado).
 */

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

  const [customer, service, ctx] = await Promise.all([
    getSupabase().from("customers").select("id").eq("id", customerId).maybeSingle(),
    getActiveService(input.serviceId),
    loadBookingContext(input.date, input.date),
  ]);
  if (!unwrap(customer)) return { ok: false, error: "Cliente não encontrado." };
  if (!service) return { ok: false, error: "Serviço indisponível." };

  const availability = computeForDate(ctx, input.date, service.durationMinutes, { ignoreMinAdvance: true });
  if (!availability.slots.some((s) => s.startTime === input.startTime)) return SLOT_TAKEN;

  const now = new Date().toISOString();
  const status = input.status ?? "CONFIRMED";
  return insertAppointment({
    customer_id: customerId,
    service_id: service.id,
    appointment_date: input.date,
    start_time: input.startTime,
    end_time: addMinutesToTime(input.startTime, service.durationMinutes),
    status,
    admin_notes: input.adminNotes || null,
    price_cents: input.priceCentsOverride !== undefined ? input.priceCentsOverride : service.priceCents,
    confirmed_at: status === "CONFIRMED" ? now : null,
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
  const [appointment, ctx] = await Promise.all([getAppointmentForMove(id), loadBookingContext(newDate, newDate)]);
  if (!appointment) return { ok: false, error: "Agendamento não encontrado." };
  if (appointment.status !== "PENDING" && appointment.status !== "CONFIRMED") {
    return { ok: false, error: "Só é possível reagendar agendamentos pendentes ou confirmados." };
  }

  const availability = computeForDate(ctx, newDate, appointment.service.durationMinutes, {
    excludeAppointmentId: id,
    ignoreMinAdvance: true,
  });
  if (!availability.slots.some((s) => s.startTime === newStartTime)) return SLOT_TAKEN;

  return moveAppointment(id, {
    appointment_date: newDate,
    start_time: newStartTime,
    end_time: addMinutesToTime(newStartTime, appointment.service.durationMinutes),
  });
}
