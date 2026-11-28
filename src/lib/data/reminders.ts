import type { AppointmentWithRelations } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";
import { APPOINTMENT_WITH_RELATIONS, toAppointmentWithRelations } from "@/lib/supabase/mappers";
import { addDaysToDateStr, nowTimeStr, todayDateStr } from "@/lib/utils/date-format";
import { parseReminderRules, type ReminderRule } from "@/lib/reminders/rules";
import { buildReminderQueue, earliestOnBookingSince, reminderHorizonDays } from "@/lib/reminders/queue";

export interface ReminderQueueItem {
  appointment: AppointmentWithRelations;
  rule: ReminderRule;
  dueAt: string;
}

export async function getReminderRules(): Promise<ReminderRule[]> {
  const row = unwrap(await getSupabase().from("settings").select("reminder_rules").eq("id", 1).single());
  return parseReminderRules(row.reminder_rules);
}

export async function saveReminderRules(rules: ReminderRule[]): Promise<void> {
  unwrap(await getSupabase().from("settings").update({ reminder_rules: rules }).eq("id", 1));
}

/** Mensagens que já estão na hora de mandar e ainda não foram abertas no WhatsApp. */
export async function getReminderQueue(): Promise<ReminderQueueItem[]> {
  const rules = await getReminderRules();
  if (!rules.some((r) => r.enabled)) return [];
  const today = todayDateStr();
  const supabase = getSupabase();
  const since = earliestOnBookingSince(rules);

  // Lembretes com hora só valem perto do dia; a confirmação, para qualquer data futura
  // confirmada depois de a regra existir (updated_at cobre a data em que foi confirmado).
  const [near, booked] = await Promise.all([
    supabase
      .from("appointments")
      .select(APPOINTMENT_WITH_RELATIONS)
      .eq("status", "CONFIRMED")
      .gte("appointment_date", today)
      .lte("appointment_date", addDaysToDateStr(today, reminderHorizonDays(rules))),
    since
      ? supabase
          .from("appointments")
          .select(APPOINTMENT_WITH_RELATIONS)
          .eq("status", "CONFIRMED")
          .gte("appointment_date", today)
          .gte("updated_at", since)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const byId = new Map<string, AppointmentWithRelations>();
  for (const row of [...unwrap(near), ...unwrap(booked)]) {
    const a = toAppointmentWithRelations(row);
    byId.set(a.id, a);
  }

  const now = `${today} ${nowTimeStr()}`;
  return buildReminderQueue(rules, [...byId.values()], now).map((entry) => ({
    appointment: byId.get(entry.appointmentId)!,
    rule: entry.rule,
    dueAt: entry.dueAt,
  }));
}

export async function markAppointmentMessages(appointmentId: string, ruleIds: string[], sent: boolean): Promise<void> {
  unwrap(
    await getSupabase().rpc("mark_appointment_messages", {
      p_appointment_id: appointmentId,
      p_rule_ids: ruleIds,
      p_sent: sent,
    })
  );
}
