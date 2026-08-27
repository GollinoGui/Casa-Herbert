import type {
  AvailabilityResult,
  BlockedSlot,
  BusinessHourRule,
  SpecialHours,
  TimeRange,
  Settings,
} from "@/types";
import {
  addMinutesToTime,
  diffInCalendarDays,
  nowTimeStr,
  timeToMinutes,
  todayDateStr,
  weekdayOf,
} from "@/lib/utils/date-format";

/**
 * lib/booking/engine.ts é a fonte da verdade das regras de agendamento —
 * funções puras, sem I/O, espelhadas 1:1 pelas migrations SQL em
 * supabase/migrations/0003_booking_functions.sql (get_available_slots /
 * create_appointment). Ver documentação.md > Arquitetura para o porquê.
 */

export interface BusyInterval {
  startTime: string;
  endTime: string;
}

/** Janelas de funcionamento efetivas para uma data: special_hours tem prioridade sobre business_hours. */
export function getEffectiveWindows(
  dateStr: string,
  businessHours: BusinessHourRule[],
  specialHours: SpecialHours[]
): TimeRange[] {
  const override = specialHours.find((s) => s.date === dateStr);
  if (override) {
    return override.isClosed ? [] : override.ranges;
  }
  const weekday = weekdayOf(dateStr);
  return businessHours
    .filter((b) => b.weekday === weekday && b.isActive)
    .map((b) => ({ startTime: b.startTime, endTime: b.endTime }))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

/** (data - hoje) em dias de calendário >= minAdvanceDays. Ver documentação.md > MIN_ADVANCE_DAYS. */
export function isDateAdvanceOk(dateStr: string, minAdvanceDays: number, today = todayDateStr()): boolean {
  return diffInCalendarDays(dateStr, today) >= minAdvanceDays;
}

export function isPastDate(dateStr: string, today = todayDateStr()): boolean {
  return diffInCalendarDays(dateStr, today) < 0;
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** Intervalos ocupados (agendamentos PENDING/CONFIRMED, já com buffer aplicado) + bloqueios manuais para a data. */
export function collectBusyIntervals(
  dateStr: string,
  activeAppointments: BusyInterval[],
  blockedSlots: BlockedSlot[],
  bufferMinutes: number
): { busy: BusyInterval[]; fullyClosed: boolean } {
  const busy: BusyInterval[] = activeAppointments.map((a) => ({
    startTime: addMinutesToTime(a.startTime, -bufferMinutes),
    endTime: addMinutesToTime(a.endTime, bufferMinutes),
  }));

  let fullyClosed = false;

  for (const block of blockedSlots) {
    if (dateStr < block.startDate || dateStr > block.endDate) continue;
    if (block.isFullDay) {
      fullyClosed = true;
      continue;
    }
    if (block.startTime && block.endTime) {
      busy.push({ startTime: block.startTime, endTime: block.endTime });
    }
  }

  return { busy, fullyClosed };
}

export interface GetAvailableSlotsParams {
  dateStr: string;
  durationMinutes: number;
  businessHours: BusinessHourRule[];
  specialHours: SpecialHours[];
  blockedSlots: BlockedSlot[];
  activeAppointments: BusyInterval[]; // status PENDING ou CONFIRMED, já filtrados pela data
  settings: Pick<Settings, "minAdvanceDays" | "bufferMinutes" | "slotStepMinutes">;
  today?: string;
  nowTime?: string;
}

export function getAvailableSlots(params: GetAvailableSlotsParams): AvailabilityResult {
  const {
    dateStr,
    durationMinutes,
    businessHours,
    specialHours,
    blockedSlots,
    activeAppointments,
    settings,
  } = params;
  const today = params.today ?? todayDateStr();
  const nowTime = params.nowTime ?? nowTimeStr();

  if (isPastDate(dateStr, today)) {
    return { bookable: false, reason: "PAST_DATE", slots: [] };
  }
  if (!isDateAdvanceOk(dateStr, settings.minAdvanceDays, today)) {
    return { bookable: false, reason: "TOO_SOON", slots: [] };
  }

  const windows = getEffectiveWindows(dateStr, businessHours, specialHours);
  if (windows.length === 0) {
    return { bookable: false, reason: "CLOSED", slots: [] };
  }

  const { busy, fullyClosed } = collectBusyIntervals(
    dateStr,
    activeAppointments,
    blockedSlots,
    settings.bufferMinutes
  );
  if (fullyClosed) {
    return { bookable: false, reason: "CLOSED", slots: [] };
  }

  const isToday = dateStr === today;
  const candidates: TimeRange[] = [];

  for (const window of windows) {
    const windowStart = timeToMinutes(window.startTime);
    const windowEnd = timeToMinutes(window.endTime);
    for (
      let start = windowStart;
      start + durationMinutes <= windowEnd;
      start += settings.slotStepMinutes
    ) {
      const end = start + durationMinutes;
      if (isToday && start <= timeToMinutes(nowTime)) continue;

      const overlapsBusy = busy.some((b) =>
        rangesOverlap(start, end, timeToMinutes(b.startTime), timeToMinutes(b.endTime))
      );
      if (overlapsBusy) continue;

      candidates.push({
        startTime: addMinutesToTime("00:00", start),
        endTime: addMinutesToTime("00:00", end),
      });
    }
  }

  if (candidates.length === 0) {
    return { bookable: false, reason: "FULLY_BOOKED", slots: [] };
  }
  return { bookable: true, slots: candidates };
}

/**
 * Revalida do zero se um horário específico ainda está livre — usado por
 * createAppointment antes de gravar (nunca confiar no que o client mostrou antes).
 */
export function isSlotStillAvailable(
  candidate: TimeRange,
  params: GetAvailableSlotsParams
): boolean {
  const result = getAvailableSlots(params);
  const candidateStart = timeToMinutes(candidate.startTime);
  const candidateEnd = timeToMinutes(candidate.endTime);
  return result.slots.some(
    (s) => timeToMinutes(s.startTime) === candidateStart && timeToMinutes(s.endTime) === candidateEnd
  );
}
