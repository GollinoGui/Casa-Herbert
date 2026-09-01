import { cn } from "@/lib/utils/cn";

/** Selo "Aberto agora" / "Fechado agora" — calculado a partir da mesma fonte de
 * verdade do motor de agendamento (ver isOpenNow em lib/data/business-hours.ts),
 * nunca um texto de horário fixo que pode ficar fora de sincronia. */
export function OpenStatusBadge({ open, className }: { open: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        open ? "bg-brand-moss/15 text-brand-moss" : "bg-brand-graphite/10 text-brand-graphite/60",
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        {open && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-moss opacity-75" />
        )}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            open ? "bg-brand-moss" : "bg-brand-graphite/40"
          )}
        />
      </span>
      {open ? "Aberto agora" : "Fechado agora"}
    </span>
  );
}
