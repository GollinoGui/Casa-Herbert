import type { AppointmentStatus, AppointmentWithRelations } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";
import { APPOINTMENT_WITH_RELATIONS, toAppointmentWithRelations } from "@/lib/supabase/mappers";
import { addDaysToDateStr, todayDateStr } from "@/lib/utils/date-format";

const ACTIVE_STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED"];

function byDateTime(a: AppointmentWithRelations, b: AppointmentWithRelations) {
  return (a.date + a.startTime).localeCompare(b.date + b.startTime);
}

export interface AppointmentFilters {
  status?: AppointmentStatus[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export async function listAppointments(filters: AppointmentFilters = {}): Promise<AppointmentWithRelations[]> {
  let query = getSupabase().from("appointments").select(APPOINTMENT_WITH_RELATIONS);
  if (filters.status?.length) query = query.in("status", filters.status);
  if (filters.dateFrom) query = query.gte("appointment_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("appointment_date", filters.dateTo);

  const items = unwrap(await query).map(toAppointmentWithRelations);

  const search = filters.search?.trim().toLowerCase();
  const filtered = search
    ? items.filter(
        (a) =>
          a.customer.fullName.toLowerCase().includes(search) ||
          a.customer.phone.includes(search) ||
          a.service.name.toLowerCase().includes(search)
      )
    : items;

  return filtered.sort(byDateTime);
}

export async function getAppointmentById(id: string): Promise<AppointmentWithRelations | null> {
  const row = unwrap(
    await getSupabase().from("appointments").select(APPOINTMENT_WITH_RELATIONS).eq("id", id).maybeSingle()
  );
  return row ? toAppointmentWithRelations(row) : null;
}

/**
 * Atualiza só se o status atual estiver em `fromStatuses` — null se não existir ou não puder transicionar.
 * `onlyStandalone`: sessão de pacote não passa por aqui (desmarcar pede a decisão do pacote e
 * concluir não aceita data futura — ver cancel_package_session/use_package_session em 0018).
 */
async function transition(
  id: string,
  fromStatuses: AppointmentStatus[],
  changes: Record<string, unknown>,
  onlyStandalone = false
): Promise<AppointmentWithRelations | null> {
  let query = getSupabase().from("appointments").update(changes).eq("id", id).in("status", fromStatuses);
  if (onlyStandalone) query = query.is("customer_package_id", null);
  const row = unwrap(await query.select(APPOINTMENT_WITH_RELATIONS).maybeSingle());
  return row ? toAppointmentWithRelations(row) : null;
}

export async function confirmAppointment(id: string): Promise<AppointmentWithRelations | null> {
  return transition(id, ["PENDING"], { status: "CONFIRMED", confirmed_at: new Date().toISOString() });
}

export async function rejectAppointment(id: string, reason?: string): Promise<AppointmentWithRelations | null> {
  return transition(id, ["PENDING"], {
    status: "REJECTED",
    cancelled_at: new Date().toISOString(),
    ...(reason ? { admin_notes: reason } : {}),
  }, true);
}

export async function cancelAppointment(id: string, reason?: string): Promise<AppointmentWithRelations | null> {
  return transition(id, ACTIVE_STATUSES, {
    status: "CANCELLED",
    cancelled_at: new Date().toISOString(),
    ...(reason ? { admin_notes: reason } : {}),
  }, true);
}

export async function completeAppointment(id: string): Promise<AppointmentWithRelations | null> {
  return transition(id, ["CONFIRMED"], { status: "COMPLETED" }, true);
}

async function updateFields(id: string, changes: Record<string, unknown>): Promise<AppointmentWithRelations | null> {
  const row = unwrap(
    await getSupabase()
      .from("appointments")
      .update(changes)
      .eq("id", id)
      .select(APPOINTMENT_WITH_RELATIONS)
      .maybeSingle()
  );
  return row ? toAppointmentWithRelations(row) : null;
}

export async function updateAppointmentAdminNotes(id: string, notes: string): Promise<AppointmentWithRelations | null> {
  return updateFields(id, { admin_notes: notes });
}

export async function updateAppointmentPrice(
  id: string,
  priceCents: number | null
): Promise<AppointmentWithRelations | null> {
  return updateFields(id, { price_cents: priceCents });
}

export async function getDashboardStats() {
  const today = todayDateStr();
  const in7 = addDaysToDateStr(today, 7);
  const in30 = addDaysToDateStr(today, 30);

  const [upcomingRows, pendingCount, confirmedCount] = await Promise.all([
    getSupabase()
      .from("appointments")
      .select(APPOINTMENT_WITH_RELATIONS)
      .gte("appointment_date", today)
      .lte("appointment_date", in30)
      .not("status", "in", "(CANCELLED,REJECTED)"),
    getSupabase().from("appointments").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
    getSupabase().from("appointments").select("id", { count: "exact", head: true }).eq("status", "CONFIRMED"),
  ]);

  const nextMonth = unwrap(upcomingRows).map(toAppointmentWithRelations).sort(byDateTime);
  const todayAppointments = nextMonth.filter((a) => a.date === today);

  return {
    todayCount: todayAppointments.length,
    pendingCount: pendingCount.count ?? 0,
    confirmedCount: confirmedCount.count ?? 0,
    weekCount: nextMonth.filter((a) => a.date <= in7).length,
    monthCount: nextMonth.length,
    upcoming: nextMonth.filter((a) => ACTIVE_STATUSES.includes(a.status)).slice(0, 6),
    todayAppointments,
  };
}

export async function updateAppointmentDiscount(
  id: string,
  discountCents: number
): Promise<AppointmentWithRelations | null> {
  return updateFields(id, { discount_cents: Math.max(0, Math.round(discountCents)) });
}

/** Atendimentos ativos de amanhã, para o bloco "Lembretes de amanhã" do Início. */
export async function getTomorrowAppointments(): Promise<AppointmentWithRelations[]> {
  const tomorrow = addDaysToDateStr(todayDateStr(), 1);
  const rows = unwrap(
    await getSupabase()
      .from("appointments")
      .select(APPOINTMENT_WITH_RELATIONS)
      .eq("appointment_date", tomorrow)
      .in("status", ACTIVE_STATUSES)
  );
  return rows.map(toAppointmentWithRelations).sort(byDateTime);
}

/** Marca (ou desmarca) que o lembrete de véspera foi aberto no WhatsApp. */
export async function setReminderSent(id: string, sent: boolean): Promise<AppointmentWithRelations | null> {
  return updateFields(id, { reminder_sent_at: sent ? new Date().toISOString() : null });
}

/**
 * Valor dos atendimentos ainda marcados (pendentes e confirmados) de hoje até o fim
 * do mês: o valor combinado no agendamento, ou o preço do serviço, menos o desconto.
 * Sessão de pacote fica de fora: o dinheiro já entrou na venda do pacote.
 * É previsão: "sob consulta" pode não virar entrada no caixa.
 */
export async function getMonthScheduledCents(): Promise<number> {
  const today = todayDateStr();
  const monthEnd = addDaysToDateStr(`${addDaysToDateStr(`${today.slice(0, 7)}-01`, 32).slice(0, 7)}-01`, -1);
  const rows = unwrap(
    await getSupabase()
      .from("appointments")
      .select("price_cents, discount_cents, service:services(price_cents)")
      .in("status", ACTIVE_STATUSES)
      .is("customer_package_id", null)
      .gte("appointment_date", today)
      .lte("appointment_date", monthEnd)
  );
  return rows.reduce((sum, r: any) => sum + Math.max(0, (r.price_cents ?? r.service?.price_cents ?? 0) - (r.discount_cents ?? 0)), 0);
}
