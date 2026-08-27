import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Parseia "YYYY-MM-DD" como data local (evita o shift de timezone do `new Date(iso)`, que interpreta como UTC). */
export function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Data de hoje (fuso local do processo) como "YYYY-MM-DD". Ver limitação de timezone no documentação.md. */
export function todayDateStr(): string {
  return formatDateOnly(new Date());
}

/** Diferença em dias de calendário (targetStr - baseStr). Positivo = no futuro. */
export function diffInCalendarDays(targetStr: string, baseStr: string): number {
  const target = parseDateOnly(targetStr);
  const base = parseDateOnly(baseStr);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((target.getTime() - base.getTime()) / msPerDay);
}

/** 0 = domingo .. 6 = sábado, igual Date.getDay() e Postgres EXTRACT(DOW). */
export function weekdayOf(dateStr: string): number {
  return parseDateOnly(dateStr).getDay();
}

export function formatLongDatePtBR(dateStr: string): string {
  const d = parseDateOnly(dateStr);
  const label = format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatShortDatePtBR(dateStr: string): string {
  return format(parseDateOnly(dateStr), "dd/MM/yyyy");
}

export function formatWeekdayPtBR(dateStr: string): string {
  const label = format(parseDateOnly(dateStr), "EEEE", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (totalMinutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function addMinutesToTime(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes);
}

export function nowTimeStr(): string {
  return format(new Date(), "HH:mm");
}

export function parseDateTimeInputToStr(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export { parse };
