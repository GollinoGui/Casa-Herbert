import type { AppointmentStatus } from "@/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/booking/constants";
import { cn } from "@/lib/utils/cn";

export function StatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  const colors = STATUS_COLORS[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium",
        colors.bg,
        colors.text,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
        active ? "bg-brand-forest/10 text-brand-forest" : "bg-brand-graphite/10 text-brand-graphite/70"
      )}
    >
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}
