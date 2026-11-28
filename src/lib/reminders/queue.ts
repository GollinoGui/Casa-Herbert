import { addDaysToDateStr, minutesToTime, salonDateTimeOf, timeToMinutes } from "@/lib/utils/date-format";
import type { ReminderRule } from "./rules";

/**
 * Fila de mensagens do WhatsApp: funções puras, sem I/O. Datas e horas como
 * texto "YYYY-MM-DD HH:mm" no fuso do salão, que comparam certo como string.
 *
 * Cada regra tem uma hora a partir da qual a mensagem vale. Por agendamento, só
 * a regra mais recente que já chegou conta: se a véspera passou sem envio e já é
 * o dia, aparece a mensagem do dia, não as duas. Some da fila quando o horário
 * começa ou quando aquela mensagem foi aberta.
 */

export interface QueueAppointment {
  id: string;
  date: string;
  startTime: string;
  status: string;
  createdAt: string;
  confirmedAt: string | null;
  customerPackageId: string | null;
  messagesSent: Record<string, string>;
}

export interface QueueEntry {
  appointmentId: string;
  rule: ReminderRule;
  dueAt: string;
}

/** Quando a regra passa a valer para o agendamento; null = não se aplica a ele. */
export function ruleDueAt(rule: ReminderRule, a: QueueAppointment): string | null {
  const t = rule.timing;
  if (t.type === "on_booking") {
    // Sessões de pacote são marcadas em lote: seriam várias confirmações seguidas para a mesma cliente.
    if (a.customerPackageId || !rule.since) return null;
    const bookedAt = a.confirmedAt ?? a.createdAt;
    if (Date.parse(bookedAt) < Date.parse(rule.since)) return null;
    return salonDateTimeOf(bookedAt);
  }
  if (t.type === "days_before") return `${addDaysToDateStr(a.date, -t.days)} ${t.at}`;
  const minutes = timeToMinutes(a.startTime) - t.hours * 60;
  return minutes >= 0
    ? `${a.date} ${minutesToTime(minutes)}`
    : `${addDaysToDateStr(a.date, -1)} ${minutesToTime(minutes + 24 * 60)}`;
}

/** A regra que vale agora para o agendamento, se ainda não foi aberta. */
export function pendingEntryFor(rules: ReminderRule[], a: QueueAppointment, now: string): QueueEntry | null {
  const start = `${a.date} ${a.startTime}`;
  if (a.status !== "CONFIRMED" || now >= start) return null;
  let latest: QueueEntry | null = null;
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const dueAt = ruleDueAt(rule, a);
    if (!dueAt || dueAt > now || dueAt >= start) continue;
    if (!latest || dueAt > latest.dueAt) latest = { appointmentId: a.id, rule, dueAt };
  }
  return latest && !a.messagesSent[latest.rule.id] ? latest : null;
}

export function buildReminderQueue(rules: ReminderRule[], appointments: QueueAppointment[], now: string): QueueEntry[] {
  return appointments
    .slice()
    .sort((x, y) => `${x.date} ${x.startTime}`.localeCompare(`${y.date} ${y.startTime}`))
    .flatMap((a) => {
      const entry = pendingEntryFor(rules, a, now);
      return entry ? [entry] : [];
    });
}

/** Até quantos dias à frente uma regra com hora marcada pode já estar valendo. */
export function reminderHorizonDays(rules: ReminderRule[]): number {
  return rules.reduce((max, r) => {
    if (!r.enabled) return max;
    if (r.timing.type === "days_before") return Math.max(max, r.timing.days);
    if (r.timing.type === "hours_before") return Math.max(max, 1);
    return max;
  }, 0);
}

/** A confirmação desde quando vale, entre as regras ligadas; null = nenhuma regra de confirmação. */
export function earliestOnBookingSince(rules: ReminderRule[]): string | null {
  const since = rules
    .filter((r) => r.enabled && r.timing.type === "on_booking" && r.since)
    .map((r) => r.since)
    .sort((x, y) => Date.parse(x) - Date.parse(y));
  return since[0] ?? null;
}
