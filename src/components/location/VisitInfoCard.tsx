import { ArrowUpRight, CalendarCheck, MapPin } from "lucide-react";
import type { BusinessHourRule } from "@/types";
import { LinkButton } from "@/components/ui/Button";
import { OpenStatusBadge } from "@/components/ui/OpenStatusBadge";
import { DIRECTIONS_URL } from "@/components/location/map-links";
import { todayDateStr, weekdayOf } from "@/lib/utils/date-format";
import { cn } from "@/lib/utils/cn";

const DAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAY_LONG = ["domingo", "segunda-feira", "terça", "quarta", "quinta", "sexta", "sábado"];

interface HoursGroup {
  days: number[];
  ranges: string[];
}

/** Junta os dias com exatamente as mesmas janelas ("Terça a sábado: 09:00–11:00 · 14:00–19:00"). */
function groupByRanges(rules: BusinessHourRule[]): HoursGroup[] {
  const byDay = new Map<number, string[]>();
  for (const r of rules) {
    if (!r.isActive) continue;
    byDay.set(r.weekday, [...(byDay.get(r.weekday) ?? []), `${r.startTime}–${r.endTime}`]);
  }
  const groups: HoursGroup[] = [];
  for (let day = 0; day < 7; day++) {
    const ranges = byDay.get(day);
    if (!ranges) continue;
    const key = ranges.join("|");
    const group = groups.find((g) => g.ranges.join("|") === key);
    if (group) group.days.push(day);
    else groups.push({ days: [day], ranges });
  }
  return groups;
}

function daysLabel(days: number[]): string {
  const isRun = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  const label =
    isRun && days.length >= 3
      ? `${DAY_LONG[days[0]]} a ${DAY_LONG[days[days.length - 1]]}`
      : days.length === 1
        ? DAY_LONG[days[0]]
        : `${days.slice(0, -1).map((d) => DAY_LONG[d]).join(", ")} e ${DAY_LONG[days[days.length - 1]]}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

interface VisitInfoCardProps {
  address: string;
  isOpen: boolean;
  businessHours: BusinessHourRule[];
  /** Botão "Agendar avaliação" no rodapé do card. */
  showCta?: boolean;
  className?: string;
}

export function VisitInfoCard({ address, isOpen, businessHours, showCta = true, className }: VisitInfoCardProps) {
  const today = weekdayOf(todayDateStr());
  const groups = groupByRanges(businessHours);
  const openDays = new Set(groups.flatMap((g) => g.days));
  const closedDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !openDays.has(d));

  return (
    <div className={cn("flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-brand-beige", className)}>
      <div className="relative overflow-hidden bg-brand-forest px-7 py-7 text-brand-cream">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-brand-gold/25 blur-2xl" />
        <p className="relative flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-brand-gold">
          <MapPin size={12} /> Endereço
        </p>
        <p className="relative mt-2 font-serif text-xl leading-snug">{address}</p>
        <a
          href={DIRECTIONS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="relative mt-4 inline-flex items-center gap-1 text-sm text-brand-cream/85 underline decoration-brand-gold/60 underline-offset-4 transition-colors hover:text-white"
        >
          Como chegar <ArrowUpRight size={14} />
        </a>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-7 py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-lg text-brand-forest">Horário de atendimento</h3>
          <OpenStatusBadge open={isOpen} />
        </div>

        <ol className="grid grid-cols-7 gap-1.5" aria-label="Dias de atendimento">
          {DAY_SHORT.map((label, day) => {
            const open = openDays.has(day);
            return (
              <li
                key={label}
                className={cn(
                  "relative flex flex-col items-center rounded-xl py-2 text-xs font-medium",
                  open ? "bg-brand-sage/25 text-brand-forest" : "bg-brand-beige/40 text-brand-graphite/35",
                  day === today && "ring-2 ring-brand-gold ring-offset-1"
                )}
              >
                <span>{label}</span>
                <span className={cn("mt-1 h-1.5 w-1.5 rounded-full", open ? "bg-brand-moss" : "bg-brand-graphite/20")} />
                <span className="sr-only">{open ? "aberto" : "fechado"}{day === today ? ", hoje" : ""}</span>
              </li>
            );
          })}
        </ol>

        <div className="space-y-3 text-sm">
          {groups.map((g) => (
            <div key={g.days.join()} className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-brand-forest">{daysLabel(g.days)}</span>
              <span className="flex flex-wrap gap-1.5">
                {g.ranges.map((range) => (
                  <span key={range} className="rounded-full bg-brand-cream px-2.5 py-1 text-xs tabular-nums text-brand-graphite/85 ring-1 ring-brand-beige">
                    {range}
                  </span>
                ))}
              </span>
            </div>
          ))}
          {closedDays.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-brand-graphite/55">
              <span>{daysLabel(closedDays)}</span>
              <span className="text-xs">Fechado</span>
            </div>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-brand-beige pt-5">
          <p className="flex items-center gap-1.5 text-xs text-brand-graphite/60">
            <CalendarCheck size={14} className="text-brand-moss" />
            Atendimento somente com hora marcada.
          </p>
          {showCta && (
            <LinkButton href="/agendar" variant="primary" className="!px-5 !py-2 !text-sm">
              Agendar
            </LinkButton>
          )}
        </div>
      </div>
    </div>
  );
}
