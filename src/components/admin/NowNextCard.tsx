"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Scissors, Timer } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { nowTimeStr, timeToMinutes } from "@/lib/utils/date-format";
import type { AppointmentWithRelations } from "@/types";

function untilLabel(minutes: number) {
  if (minutes < 1) return "agora";
  if (minutes < 60) return `em ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `em ${h}h${m ? String(m).padStart(2, "0") : ""}`;
}

/** Hora do salão no cliente, atualizada a cada 30s. Começa nula para não divergir do HTML do servidor. */
function useSalonClock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setNow(nowTimeStr());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function NowNextCard({
  appointments,
  onOpen,
}: {
  /** Atendimentos de hoje, em ordem de horário. */
  appointments: AppointmentWithRelations[];
  onOpen: (id: string) => void;
}) {
  const now = useSalonClock();
  if (!now) return null;

  const active = appointments.filter((a) => a.status === "PENDING" || a.status === "CONFIRMED");
  const current = active.find((a) => a.startTime <= now && now < a.endTime) ?? null;
  const next = active.find((a) => a.startTime > now) ?? null;
  if (!current && !next) return null;

  const nowMin = timeToMinutes(now);

  return (
    <div className={cn("grid gap-3", current && next ? "sm:grid-cols-2" : "grid-cols-1")}>
      {current ? (
        <button
          type="button"
          onClick={() => onOpen(current.id)}
          className="cartao-vivo group relative flex items-center gap-4 overflow-hidden rounded-[22px] border border-transparent bg-gradient-to-br from-brand-pine to-brand-pineSoft p-5 text-left text-brand-onPine shadow-softer"
        >
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-onPine/10">
            <Scissors size={20} strokeWidth={1.75} aria-hidden="true" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-brand-forest" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-brand-onPine/70">Atendendo agora · até {current.endTime}</span>
            <span className="block truncate text-lg font-semibold">{current.customer.fullName}</span>
            <span className="block truncate text-xs text-brand-onPine/70">{current.service.name}</span>
          </span>
          <span className="shrink-0 text-xs tabular-nums text-brand-onPine/70">
            faltam {Math.max(0, timeToMinutes(current.endTime) - nowMin)} min
          </span>
          {/* Quanto do horário já passou. */}
          <span
            className="absolute inset-x-0 bottom-0 h-1 origin-left bg-brand-forest/80"
            style={{
              transform: `scaleX(${Math.min(
                1,
                (nowMin - timeToMinutes(current.startTime)) /
                  Math.max(1, timeToMinutes(current.endTime) - timeToMinutes(current.startTime))
              )})`,
            }}
            aria-hidden="true"
          />
        </button>
      ) : null}

      {next ? (
        <button
          type="button"
          onClick={() => onOpen(next.id)}
          className="cartao-vivo group flex items-center gap-4 rounded-[22px] border border-brand-beige bg-white p-5 text-left shadow-softer"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-sage/20 text-brand-moss">
            <Timer size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-brand-graphite/60">
              Próximo · {next.startTime} <span className="text-brand-moss">({untilLabel(timeToMinutes(next.startTime) - nowMin)})</span>
            </span>
            <span className="block truncate text-lg font-semibold text-brand-graphite">{next.customer.fullName}</span>
            <span className="block truncate text-xs text-brand-graphite/60">
              {next.service.name}
              {next.status === "PENDING" ? " · ainda não confirmado" : ""}
            </span>
          </span>
          <ArrowRight size={16} className="shrink-0 text-brand-graphite/40 transition group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
