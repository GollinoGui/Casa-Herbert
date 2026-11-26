import { cn } from "@/lib/utils/cn";
import type { PayableStatus, SaleStatus } from "@/types";

const SALE: Record<SaleStatus, { label: string; className: string }> = {
  paid: { label: "Pago", className: "bg-emerald-50 text-emerald-800" },
  open: { label: "Em aberto", className: "bg-amber-50 text-amber-800" },
  cancelled: { label: "Cancelada", className: "bg-brand-graphite/10 text-brand-graphite/60" },
};

export function SaleStatusBadge({ status, partial }: { status: SaleStatus; partial?: boolean }) {
  const s = SALE[status];
  return (
    <span className={cn("inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", s.className)}>
      {status === "open" && partial ? "Pago em parte" : s.label}
    </span>
  );
}

export function PayableStatusBadge({ status, overdue }: { status: PayableStatus; overdue?: boolean }) {
  const label = status === "paid" ? "Paga" : status === "cancelled" ? "Cancelada" : overdue ? "Atrasada" : "A pagar";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "paid"
          ? "bg-emerald-50 text-emerald-800"
          : status === "cancelled"
            ? "bg-brand-graphite/10 text-brand-graphite/60"
            : overdue
              ? "bg-red-50 text-red-700"
              : "bg-amber-50 text-amber-800"
      )}
    >
      {label}
    </span>
  );
}

/** Texto com valor em reais some com "Esconder valores" (globals.css); contagens continuam visíveis. */
const sensitive = (text: string) => (text.includes("R$") ? "valor-sensivel" : undefined);

export function StatTile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "in" | "out" | "warn" }) {
  return (
    <div className="rounded-2xl border border-brand-beige bg-white p-4 shadow-softer">
      <p className="text-xs font-medium text-brand-graphite/60">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums sm:text-2xl",
          sensitive(value),
          tone === "in" ? "text-emerald-800" : tone === "out" ? "text-red-700" : tone === "warn" ? "text-amber-800" : "text-brand-graphite"
        )}
      >
        {value}
      </p>
      {hint ? <p className={cn("mt-0.5 text-xs text-brand-graphite/50", sensitive(hint))}>{hint}</p> : null}
    </div>
  );
}
