import { addDays, format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Parseia "YYYY-MM-DD" como data local (evita o shift de timezone do `new Date(iso)`, que interpreta como UTC). */
export function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * "Hoje"/"agora" sempre no fuso do salão, nunca no do processo: na Vercel o
 * servidor roda em UTC, e a partir das 21h de Brasília já seria "amanhã".
 */
export const SALON_TIMEZONE = "America/Sao_Paulo";

function salonParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SALON_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** Data de hoje no fuso do salão, como "YYYY-MM-DD". */
export function todayDateStr(): string {
  return salonParts(new Date()).date;
}

/** Data ("YYYY-MM-DD") no fuso do salão de um timestamp ISO — ex.: createdAt de uma venda. */
export function salonDateOf(isoTimestamp: string): string {
  return salonParts(new Date(isoTimestamp)).date;
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  return formatDateOnly(addDays(parseDateOnly(dateStr), days));
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
  return salonParts(new Date()).time;
}

/** Formata um Date arbitrário (não necessariamente "agora") como "HH:mm". */
export function formatTimeOnly(date: Date): string {
  return format(date, "HH:mm");
}

export function parseDateTimeInputToStr(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export { parse };
