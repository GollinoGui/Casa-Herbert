import type { AppointmentWithRelations, BusinessHourRule, TimeRange } from "@/types";
import { getEffectiveWindows } from "@/lib/booking/engine";
import { nowTimeStr, timeToMinutes, todayDateStr, weekdayOf } from "@/lib/utils/date-format";
import { getSupabase, unwrap } from "@/lib/supabase/server";
import {
  APPOINTMENT_WITH_RELATIONS,
  toAppointmentWithRelations,
  toBusinessHour,
  toSpecialHours,
} from "@/lib/supabase/mappers";

export async function getBusinessHours(): Promise<BusinessHourRule[]> {
  const rows = unwrap(await getSupabase().from("business_hours").select("*"));
  return rows
    .map(toBusinessHour)
    .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
}

/** Se a Casa Herbert está aberta neste exato momento — mesma fonte de verdade do
 * motor de agendamento (horários + horários especiais + bloqueios de dia inteiro),
 * nunca um texto de horário duplicado e fora de sincronia. */
export async function isOpenNow(): Promise<boolean> {
  const supabase = getSupabase();
  const today = todayDateStr();
  const [businessHours, specialHours, fullDayBlocks] = await Promise.all([
    supabase.from("business_hours").select("*").eq("weekday", weekdayOf(today)).eq("is_active", true),
    supabase.from("special_hours").select("*, special_hours_ranges(*)").eq("special_date", today),
    supabase
      .from("blocked_slots")
      .select("id", { count: "exact", head: true })
      .eq("is_full_day", true)
      .lte("start_date", today)
      .gte("end_date", today),
  ]);

  const windows = getEffectiveWindows(
    today,
    unwrap(businessHours).map(toBusinessHour),
    unwrap(specialHours).map(toSpecialHours)
  );
  if (windows.length === 0) return false;
  if ((fullDayBlocks.count ?? 0) > 0) return false;

  const nowMinutes = timeToMinutes(nowTimeStr());
  return windows.some((w) => nowMinutes >= timeToMinutes(w.startTime) && nowMinutes < timeToMinutes(w.endTime));
}

/**
 * Substitui as janelas de um dia da semana. Retorna os agendamentos futuros
 * PENDING/CONFIRMED que ficariam fora da nova janela — a UI deve exibir como
 * aviso, nunca cancelar automaticamente (ver documentação.md > Casos de conflito).
 */
export async function replaceBusinessHoursForWeekday(
  weekday: number,
  ranges: TimeRange[]
): Promise<{ warnings: AppointmentWithRelations[] }> {
  const supabase = getSupabase();
  unwrap(await supabase.rpc("replace_business_hours", { p_weekday: weekday, p_ranges: ranges }));

  const today = todayDateStr();
  const [businessHours, specialHours, upcoming] = await Promise.all([
    getBusinessHours(),
    supabase.from("special_hours").select("*, special_hours_ranges(*)").gte("special_date", today),
    supabase
      .from("appointments")
      .select(APPOINTMENT_WITH_RELATIONS)
      .gte("appointment_date", today)
      .in("status", ["PENDING", "CONFIRMED"]),
  ]);
  const special = unwrap(specialHours).map(toSpecialHours);

  const warnings = unwrap(upcoming)
    .map(toAppointmentWithRelations)
    .filter((a) => {
      if (weekdayOf(a.date) !== weekday) return false;
      const windows = getEffectiveWindows(a.date, businessHours, special);
      return !windows.some((w) => a.startTime >= w.startTime && a.endTime <= w.endTime);
    });

  return { warnings };
}
