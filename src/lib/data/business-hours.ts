import { randomUUID } from "node:crypto";
import type { AppointmentWithRelations, BusinessHourRule, TimeRange } from "@/types";
import { mutateDb, readDb } from "./store";
import { getEffectiveWindows } from "@/lib/booking/engine";
import { nowTimeStr, timeToMinutes, todayDateStr } from "@/lib/utils/date-format";
import { hydrateAppointment } from "./appointments";

export async function getBusinessHours(): Promise<BusinessHourRule[]> {
  const db = readDb();
  return [...db.businessHours].sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
}

/** Se a Casa Herbert está aberta neste exato momento — mesma fonte de verdade do
 * motor de agendamento (horários + horários especiais + bloqueios de dia inteiro),
 * nunca um texto de horário duplicado e fora de sincronia. */
export async function isOpenNow(): Promise<boolean> {
  const db = readDb();
  const today = todayDateStr();
  const windows = getEffectiveWindows(today, db.businessHours, db.specialHours);
  if (windows.length === 0) return false;

  const fullyBlocked = db.blockedSlots.some(
    (b) => b.isFullDay && today >= b.startDate && today <= b.endDate
  );
  if (fullyBlocked) return false;

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
  const warnings: AppointmentWithRelations[] = mutateDb((db) => {
    db.businessHours = db.businessHours.filter((b) => b.weekday !== weekday);
    for (const range of ranges) {
      db.businessHours.push({
        id: randomUUID(),
        weekday,
        startTime: range.startTime,
        endTime: range.endTime,
        isActive: true,
      });
    }

    const today = todayDateStr();
    const affected = db.appointments.filter((a) => {
      if (a.status !== "PENDING" && a.status !== "CONFIRMED") return false;
      if (a.date < today) return false;
      const dow = new Date(a.date + "T00:00:00").getDay();
      if (dow !== weekday) return false;
      const windows = getEffectiveWindows(a.date, db.businessHours, db.specialHours);
      const fits = windows.some((w) => a.startTime >= w.startTime && a.endTime <= w.endTime);
      return !fits;
    });

    return affected.map((a) => hydrateAppointment(a, db)).filter((a): a is AppointmentWithRelations => a !== null);
  });

  return { warnings };
}
