import type { AppointmentWithRelations, Customer } from "@/types";
import { canonicalPhone } from "@/lib/utils/phone";
import { addDaysToDateStr, diffInCalendarDays, todayDateStr } from "@/lib/utils/date-format";
import { fetchAll, getSupabase, PG_UNIQUE_VIOLATION, unwrap } from "@/lib/supabase/server";
import { APPOINTMENT_WITH_RELATIONS, toAppointmentWithRelations, toCustomer } from "@/lib/supabase/mappers";

export async function getCustomers(): Promise<Customer[]> {
  const rows = unwrap(await getSupabase().from("customers").select("*"));
  return rows.map(toCustomer).sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const row = unwrap(await getSupabase().from("customers").select("*").eq("id", id).maybeSingle());
  return row ? toCustomer(row) : null;
}

/** O cliente é reconhecido pelo telefone canônico (com ou sem 55, com ou sem máscara). */
export async function findCustomerByPhone(phone: string): Promise<Customer | null> {
  const row = unwrap(
    await getSupabase().from("customers").select("*").eq("normalized_phone", canonicalPhone(phone)).maybeSingle()
  );
  return row ? toCustomer(row) : null;
}

export async function getCustomerAppointments(customerId: string): Promise<AppointmentWithRelations[]> {
  const rows = unwrap(
    await getSupabase()
      .from("appointments")
      .select(APPOINTMENT_WITH_RELATIONS)
      .eq("customer_id", customerId)
      .order("appointment_date", { ascending: false })
      .order("start_time", { ascending: false })
  );
  return rows.map(toAppointmentWithRelations);
}

export interface FindOrCreateCustomerInput {
  fullName: string;
  phone: string;
  email?: string | null;
}

/**
 * Deduplica pelo telefone canônico — não representa login, só liga o pedido à ficha
 * que já existe. Um cliente já cadastrado mantém o nome da ficha: quem digita um
 * telefone no site não pode renomear o cadastro feito no painel. O e-mail só é
 * preenchido se a ficha ainda não tiver um.
 */
export async function findOrCreateCustomer(input: FindOrCreateCustomerInput): Promise<Customer> {
  const supabase = getSupabase();

  const existing = await findCustomerByPhone(input.phone);
  if (existing) {
    if (input.email && !existing.email) {
      const row = unwrap(
        await supabase.from("customers").update({ email: input.email }).eq("id", existing.id).select("*").single()
      );
      return toCustomer(row);
    }
    return existing;
  }

  const inserted = await supabase
    .from("customers")
    .insert({ full_name: input.fullName, phone: input.phone, email: input.email || null })
    .select("*")
    .single();
  // Corrida: outra requisição criou o mesmo telefone entre o select e o insert.
  if (inserted.error?.code === PG_UNIQUE_VIOLATION) return findOrCreateCustomer(input);
  return toCustomer(unwrap(inserted));
}

export interface CustomerInput {
  fullName: string;
  phone: string;
  email: string | null;
  birthDate?: string | null;
}

function customerRow(input: CustomerInput) {
  const row: Record<string, unknown> = { full_name: input.fullName, phone: input.phone, email: input.email || null };
  if (input.birthDate !== undefined) row.birth_date = input.birthDate || null;
  return row;
}

export type SaveCustomerResult = { ok: true; customer: Customer } | { ok: false; error: string };

async function phoneTakenError(phone: string): Promise<SaveCustomerResult> {
  const owner = await findCustomerByPhone(phone);
  return {
    ok: false,
    error: owner
      ? `Esse telefone já está cadastrado para ${owner.fullName}.`
      : "Esse telefone já está cadastrado para outro cliente.",
  };
}

export async function createCustomer(input: CustomerInput): Promise<SaveCustomerResult> {
  const result = await getSupabase()
    .from("customers")
    .insert(customerRow(input))
    .select("*")
    .single();
  if (result.error?.code === PG_UNIQUE_VIOLATION) return phoneTakenError(input.phone);
  return { ok: true, customer: toCustomer(unwrap(result)) };
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<SaveCustomerResult> {
  const result = await getSupabase()
    .from("customers")
    .update(customerRow(input))
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (result.error?.code === PG_UNIQUE_VIOLATION) return phoneTakenError(input.phone);
  const row = unwrap(result);
  if (!row) return { ok: false, error: "Cliente não encontrado." };
  return { ok: true, customer: toCustomer(row) };
}

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export interface UpcomingBirthday {
  customer: Customer;
  /** Dia do aniversário neste ciclo ("YYYY-MM-DD"). */
  date: string;
  /** 0 = hoje. */
  daysAway: number;
}

/**
 * Aniversários de hoje até `days - 1` dias à frente. Compara dia e mês (o ano
 * do cadastro não importa), então atravessa a virada do ano. Quem nasceu em
 * 29/02 comemora em 28/02 nos anos não bissextos.
 */
export async function getUpcomingBirthdays(days = 7): Promise<UpcomingBirthday[]> {
  const today = todayDateStr();
  const rows = unwrap(await getSupabase().from("customers").select("*").not("birth_date", "is", null));
  const window = new Map<string, { date: string; daysAway: number }>();
  for (let i = 0; i < days; i++) {
    const date = addDaysToDateStr(today, i);
    window.set(date.slice(5), { date, daysAway: i });
    if (date.slice(5) === "02-28" && !isLeapYear(Number(date.slice(0, 4)))) window.set("02-29", { date, daysAway: i });
  }
  return rows
    .map(toCustomer)
    .flatMap((customer) => {
      const hit = customer.birthDate ? window.get(customer.birthDate.slice(5)) : undefined;
      return hit ? [{ customer, ...hit }] : [];
    })
    .sort((a, b) => a.daysAway - b.daysAway || a.customer.fullName.localeCompare(b.customer.fullName, "pt-BR"));
}

export interface LapsedCustomer {
  customer: Customer;
  /** Último atendimento concluído. */
  lastVisit: string;
  daysSince: number;
}

/**
 * Quem já foi atendido no último ano, não tem atendimento concluído há pelo
 * menos `lapsedDays` dias e não tem nada marcado. Quem nunca foi atendido não
 * entra: não é "sumido", é só cadastro. Volta os mais recentes primeiro (os
 * mais fáceis de trazer de volta) e o total.
 */
export async function getLapsedCustomers(lapsedDays: number, limit = 8): Promise<{ total: number; list: LapsedCustomer[] }> {
  const supabase = getSupabase();
  const today = todayDateStr();
  const [completed, upcoming] = await Promise.all([
    fetchAll<{ id: string; customer_id: string; appointment_date: string }>((from, to) =>
      supabase
        .from("appointments")
        .select("id, customer_id, appointment_date")
        .eq("status", "COMPLETED")
        .gte("appointment_date", addDaysToDateStr(today, -365))
        .lte("appointment_date", today)
        .order("id")
        .range(from, to)
    ),
    fetchAll<{ id: string; customer_id: string }>((from, to) =>
      supabase
        .from("appointments")
        .select("id, customer_id")
        .in("status", ["PENDING", "CONFIRMED"])
        .gte("appointment_date", today)
        .order("id")
        .range(from, to)
    ),
  ]);

  const lastVisit = new Map<string, string>();
  for (const a of completed) {
    const prev = lastVisit.get(a.customer_id);
    if (!prev || a.appointment_date > prev) lastVisit.set(a.customer_id, a.appointment_date);
  }
  const booked = new Set(upcoming.map((a) => a.customer_id));
  const cutoff = addDaysToDateStr(today, -lapsedDays);
  const lapsed = [...lastVisit]
    .filter(([id, date]) => date <= cutoff && !booked.has(id))
    .sort((a, b) => b[1].localeCompare(a[1]));
  if (!lapsed.length) return { total: 0, list: [] };

  const top = lapsed.slice(0, limit);
  const rows = unwrap(await supabase.from("customers").select("*").in("id", top.map(([id]) => id)));
  const byId = new Map(rows.map((r) => [r.id as string, toCustomer(r)]));
  const list = top.flatMap(([id, date]) => {
    const customer = byId.get(id);
    return customer ? [{ customer, lastVisit: date, daysSince: diffInCalendarDays(today, date) }] : [];
  });
  return { total: lapsed.length, list };
}

export async function updateCustomerNotes(id: string, notes: string): Promise<Customer | null> {
  const row = unwrap(
    await getSupabase().from("customers").update({ notes }).eq("id", id).select("*").maybeSingle()
  );
  return row ? toCustomer(row) : null;
}

export interface ReturnDueCustomer {
  customer: Customer;
  serviceName: string;
  lastVisit: string;
  /** Dia sugerido para o retorno (último atendimento + prazo do serviço). */
  dueDate: string;
  /** Negativo = já passou do dia. */
  daysUntil: number;
}

/** Quem passou do dia do retorno há mais que isso já está em "não voltam há um tempo". */
const RETURN_OVERDUE_WINDOW_DAYS = 60;

/**
 * Clientes na hora do retorno: para cada serviço com prazo (services.return_days),
 * o último atendimento concluído daquele serviço + o prazo cai entre 60 dias atrás
 * e `aheadDays` à frente, e a cliente não tem nada marcado. Uma linha por cliente
 * (o retorno mais próximo), mais atrasados primeiro.
 */
export async function getReturnDueCustomers(aheadDays = 7, limit = 8): Promise<{ total: number; list: ReturnDueCustomer[] }> {
  const supabase = getSupabase();
  const today = todayDateStr();
  const services = unwrap(await supabase.from("services").select("id, name, return_days").not("return_days", "is", null));
  if (!services.length) return { total: 0, list: [] };
  const serviceById = new Map(services.map((s) => [s.id as string, s as { id: string; name: string; return_days: number }]));
  const longest = Math.max(...services.map((s) => Number(s.return_days)));

  const [completed, upcoming] = await Promise.all([
    fetchAll<{ id: string; customer_id: string; service_id: string; appointment_date: string }>((from, to) =>
      supabase
        .from("appointments")
        .select("id, customer_id, service_id, appointment_date")
        .eq("status", "COMPLETED")
        .in("service_id", [...serviceById.keys()])
        .gte("appointment_date", addDaysToDateStr(today, -(longest + RETURN_OVERDUE_WINDOW_DAYS)))
        .lte("appointment_date", today)
        .order("id")
        .range(from, to)
    ),
    fetchAll<{ id: string; customer_id: string }>((from, to) =>
      supabase
        .from("appointments")
        .select("id, customer_id")
        .in("status", ["PENDING", "CONFIRMED"])
        .gte("appointment_date", today)
        .order("id")
        .range(from, to)
    ),
  ]);

  const last = new Map<string, { customerId: string; serviceId: string; date: string }>();
  for (const a of completed) {
    const key = `${a.customer_id}|${a.service_id}`;
    const prev = last.get(key);
    if (!prev || a.appointment_date > prev.date) last.set(key, { customerId: a.customer_id, serviceId: a.service_id, date: a.appointment_date });
  }

  const booked = new Set(upcoming.map((a) => a.customer_id));
  const earliest = addDaysToDateStr(today, -RETURN_OVERDUE_WINDOW_DAYS);
  const latest = addDaysToDateStr(today, aheadDays);
  const best = new Map<string, { serviceName: string; lastVisit: string; dueDate: string }>();
  for (const { customerId, serviceId, date } of last.values()) {
    if (booked.has(customerId)) continue;
    const service = serviceById.get(serviceId)!;
    const dueDate = addDaysToDateStr(date, Number(service.return_days));
    if (dueDate < earliest || dueDate > latest) continue;
    const prev = best.get(customerId);
    if (!prev || dueDate < prev.dueDate) best.set(customerId, { serviceName: service.name, lastVisit: date, dueDate });
  }
  const sorted = [...best].sort((a, b) => a[1].dueDate.localeCompare(b[1].dueDate));
  if (!sorted.length) return { total: 0, list: [] };

  const top = sorted.slice(0, limit);
  const rows = unwrap(await supabase.from("customers").select("*").in("id", top.map(([id]) => id)));
  const byId = new Map(rows.map((r) => [r.id as string, toCustomer(r)]));
  const list = top.flatMap(([id, info]) => {
    const customer = byId.get(id);
    return customer ? [{ customer, ...info, daysUntil: diffInCalendarDays(info.dueDate, today) }] : [];
  });
  return { total: sorted.length, list };
}
