import type { WaitlistEntry, WaitlistPeriod, WaitlistStatus } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";
import { todayDateStr } from "@/lib/utils/date-format";
import { getAvailableSlotsForService } from "@/lib/data/availability";

type Row = Record<string, any>;

function toWaitlistEntry(r: Row): WaitlistEntry {
  return {
    id: r.id,
    customer: { id: r.customer?.id ?? r.customer_id, fullName: r.customer?.full_name ?? "", phone: r.customer?.phone ?? "" },
    serviceId: r.service_id ?? null,
    serviceName: r.service?.name ?? null,
    desiredDate: r.desired_date,
    period: r.period,
    notes: r.notes ?? null,
    status: r.status,
    createdAt: r.created_at,
  };
}

const SELECT = "*, customer:customers(id, full_name, phone), service:services(name)";

/** Os que ainda esperam, de hoje em diante, por data. */
export async function listWaitlist(status: WaitlistStatus = "waiting"): Promise<WaitlistEntry[]> {
  let query = getSupabase().from("waitlist").select(SELECT).eq("status", status);
  if (status === "waiting") query = query.gte("desired_date", todayDateStr());
  const rows = unwrap(await query.order("desired_date").order("created_at"));
  return rows.map(toWaitlistEntry);
}

export interface WaitlistInput {
  customerId: string;
  serviceId: string | null;
  desiredDate: string;
  period: WaitlistPeriod;
  notes: string | null;
}

export async function addToWaitlist(input: WaitlistInput): Promise<void> {
  unwrap(
    await getSupabase().from("waitlist").insert({
      customer_id: input.customerId,
      service_id: input.serviceId,
      desired_date: input.desiredDate,
      period: input.period,
      notes: input.notes,
    })
  );
}

export async function setWaitlistStatus(id: string, status: WaitlistStatus): Promise<void> {
  unwrap(await getSupabase().from("waitlist").update({ status }).eq("id", id));
}

const NOON = "12:00";

function fitsPeriod(startTime: string, period: WaitlistPeriod) {
  if (period === "morning") return startTime < NOON;
  if (period === "afternoon") return startTime >= NOON;
  return true;
}

export interface WaitlistOpening {
  entry: WaitlistEntry;
  /** Primeiro horário livre que serve (no período pedido). */
  startTime: string;
}

/**
 * Quem da lista de espera já pode ser encaixado: o dia pedido tem horário livre
 * para o serviço (mesma regra do agendamento) dentro do período escolhido.
 * Sem serviço na espera, usa o primeiro serviço ativo como referência de duração.
 */
export async function getWaitlistOpenings(): Promise<WaitlistOpening[]> {
  const entries = await listWaitlist("waiting");
  if (!entries.length) return [];
  let fallbackServiceId: string | null = null;
  if (entries.some((e) => !e.serviceId)) {
    const row = unwrap(
      await getSupabase().from("services").select("id").eq("is_active", true).order("display_order").limit(1).maybeSingle()
    );
    fallbackServiceId = row?.id ?? null;
  }
  const cache = new Map<string, string[]>();
  const openings: WaitlistOpening[] = [];
  for (const entry of entries) {
    const serviceId = entry.serviceId ?? fallbackServiceId;
    if (!serviceId) continue;
    const key = `${entry.desiredDate}|${serviceId}`;
    if (!cache.has(key)) {
      const result = await getAvailableSlotsForService(entry.desiredDate, serviceId);
      cache.set(key, result.bookable ? result.slots.map((s) => s.startTime) : []);
    }
    const start = cache.get(key)!.find((t) => fitsPeriod(t, entry.period));
    if (start) openings.push({ entry, startTime: start });
  }
  return openings;
}
