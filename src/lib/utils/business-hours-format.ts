import type { BusinessHourRule } from "@/types";

const DAY_LONG = ["domingo", "segunda-feira", "terça", "quarta", "quinta", "sexta", "sábado"];
const SCHEMA_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface HoursGroup {
  days: number[];
  ranges: { startTime: string; endTime: string }[];
}

/** Junta os dias com exatamente as mesmas janelas ("Terça a sábado: 09:00–11:00 · 14:00–19:00"). */
export function groupByRanges(rules: BusinessHourRule[]): HoursGroup[] {
  const byDay = new Map<number, HoursGroup["ranges"]>();
  for (const r of rules) {
    if (!r.isActive) continue;
    byDay.set(r.weekday, [...(byDay.get(r.weekday) ?? []), { startTime: r.startTime, endTime: r.endTime }]);
  }
  const key = (ranges: HoursGroup["ranges"]) => ranges.map((r) => `${r.startTime}-${r.endTime}`).join("|");
  const groups: HoursGroup[] = [];
  for (let day = 0; day < 7; day++) {
    const ranges = byDay.get(day);
    if (!ranges) continue;
    const group = groups.find((g) => key(g.ranges) === key(ranges));
    if (group) group.days.push(day);
    else groups.push({ days: [day], ranges });
  }
  return groups;
}

export function closedDaysOf(groups: HoursGroup[]): number[] {
  const open = new Set(groups.flatMap((g) => g.days));
  return [0, 1, 2, 3, 4, 5, 6].filter((d) => !open.has(d));
}

export function daysLabel(days: number[]): string {
  const isRun = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  const label =
    isRun && days.length >= 3
      ? `${DAY_LONG[days[0]]} a ${DAY_LONG[days[days.length - 1]]}`
      : days.length === 1
        ? DAY_LONG[days[0]]
        : `${days.slice(0, -1).map((d) => DAY_LONG[d]).join(", ")} e ${DAY_LONG[days[days.length - 1]]}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function rangeLabel(range: HoursGroup["ranges"][number]): string {
  return `${range.startTime}–${range.endTime}`;
}

/** `openingHoursSpecification` do schema.org (JSON-LD), uma entrada por janela. */
export function toOpeningHoursSpecification(groups: HoursGroup[]) {
  return groups.flatMap((g) =>
    g.ranges.map((r) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: g.days.map((d) => SCHEMA_DAYS[d]),
      opens: r.startTime,
      closes: r.endTime,
    }))
  );
}
