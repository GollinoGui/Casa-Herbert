"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Layers, NotebookPen, ShoppingBag, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { SaleStatusBadge } from "@/components/admin/FinanceBadges";
import { formatBRL } from "@/lib/utils/money";
import { formatShortDatePtBR } from "@/lib/utils/date-format";
import { cn } from "@/lib/utils/cn";
import type { AppointmentWithRelations, CustomerRecord, Sale } from "@/types";

type Kind = "appointment" | "sale" | "record";

interface Item {
  key: string;
  kind: Kind;
  /** "YYYY-MM-DD HH:mm" para ordenar. */
  sort: string;
  date: string;
  render: () => React.ReactNode;
  onClick?: () => void;
  /** Venda de um atendimento que já está na lista: em "Tudo" ela aparece dentro da linha do atendimento. */
  merged?: boolean;
}

const FILTERS: { value: Kind | "all"; label: string }[] = [
  { value: "all", label: "Tudo" },
  { value: "appointment", label: "Atendimentos" },
  { value: "sale", label: "Compras" },
  { value: "record", label: "Acompanhamento" },
];

const ICON: Record<Kind, LucideIcon> = { appointment: CalendarDays, sale: ShoppingBag, record: NotebookPen };
const PAGE = 20;

const MONTH = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const monthLabel = (date: string) => {
  const label = MONTH.format(new Date(`${date.slice(0, 7)}-15T12:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
};

/** Produtos levados junto com o atendimento (o serviço já é o título da linha). */
function saleExtras(sale: Sale | undefined, serviceName: string) {
  if (!sale) return null;
  const extras = sale.items.filter((i) => i.description !== serviceName).map((i) => `${i.description}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`);
  return extras.length ? ` · + ${extras.join(", ")}` : null;
}

/** Tudo o que aconteceu com a cliente numa sequência só, do mais recente ao mais antigo. */
export function CustomerTimeline({
  appointments,
  sales,
  records,
  onOpenAppointment,
}: {
  appointments: AppointmentWithRelations[];
  sales: Sale[];
  records: CustomerRecord[];
  onOpenAppointment: (id: string) => void;
}) {
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [limit, setLimit] = useState(PAGE);

  const items = useMemo<Item[]>(() => {
    const appointmentIds = new Set(appointments.map((a) => a.id));
    const saleByAppointment = new Map(
      sales.filter((s) => s.appointmentId && s.status !== "cancelled").map((s) => [s.appointmentId as string, s])
    );
    const list: Item[] = [
      ...appointments.map(
        (a): Item => ({
          key: `a-${a.id}`,
          kind: "appointment",
          sort: `${a.date} ${a.startTime}`,
          date: a.date,
          onClick: () => onOpenAppointment(a.id),
          render: () => (
            <>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate font-medium text-brand-graphite">
                  {a.service.name}
                  {a.customerPackageId ? <Layers size={13} className="shrink-0 text-brand-moss" aria-label="Sessão de pacote" /> : null}
                </p>
                <p className="truncate text-xs text-brand-graphite/60">
                  {formatShortDatePtBR(a.date)} · {a.startTime}
                  {saleExtras(saleByAppointment.get(a.id), a.service.name)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={a.status} />
                {saleByAppointment.has(a.id) && filter === "all" ? (
                  <span className="valor-sensivel font-medium tabular-nums">{formatBRL(saleByAppointment.get(a.id)!.totalCents)}</span>
                ) : null}
              </div>
            </>
          ),
        })
      ),
      ...sales.map(
        (s): Item => ({
          key: `s-${s.id}`,
          kind: "sale",
          merged: !!s.appointmentId && appointmentIds.has(s.appointmentId) && s.status !== "cancelled",
          sort: `${s.saleDate} ${s.createdAt.slice(11, 16)}`,
          date: s.saleDate,
          render: () => (
            <>
              <div className="min-w-0">
                <p className="truncate text-brand-graphite">
                  {s.items.map((i) => `${i.description}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ")}
                </p>
                <p className="text-xs text-brand-graphite/60">{formatShortDatePtBR(s.saleDate)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <SaleStatusBadge status={s.status} partial={s.paidCents > 0} />
                <span className="valor-sensivel font-medium tabular-nums">{formatBRL(s.totalCents)}</span>
              </div>
            </>
          ),
        })
      ),
      ...records.map(
        (r): Item => ({
          key: `r-${r.id}`,
          kind: "record",
          sort: `${r.date} ${r.createdAt.slice(11, 16)}`,
          date: r.date,
          render: () => (
            <div className="min-w-0">
              <p className="font-medium text-brand-graphite">
                Acompanhamento{r.photos.length ? ` · ${r.photos.length} foto(s)` : ""}
              </p>
              {r.notes ? <p className="line-clamp-2 text-xs text-brand-graphite/70">{r.notes}</p> : null}
            </div>
          ),
        })
      ),
    ];
    return list.sort((a, b) => b.sort.localeCompare(a.sort));
  }, [appointments, sales, records, onOpenAppointment, filter]);

  const visible = items.filter((i) => (filter === "all" ? !i.merged : i.kind === filter));
  const shown = visible.slice(0, limit);
  const groups: [string, Item[]][] = [];
  for (const item of shown) {
    const month = item.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last[0] === month) last[1].push(item);
    else groups.push([month, [item]]);
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-lg text-brand-forest">Linha do tempo</h3>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar a linha do tempo">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setFilter(f.value);
                setLimit(PAGE);
              }}
              aria-pressed={filter === f.value}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                filter === f.value ? "border-brand-forest bg-brand-forest text-brand-ink" : "border-brand-beige text-brand-graphite/70 hover:border-brand-sage"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-brand-graphite/60">Nada registrado ainda.</p>
      ) : (
        <div className="space-y-5">
          {groups.map(([month, list]) => (
            <section key={month}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-graphite/50">{monthLabel(`${month}-01`)}</p>
              <ol className="relative space-y-2 border-l border-brand-beige pl-5">
                {list.map((item) => {
                  const Icon = ICON[item.kind];
                  const body = (
                    <div className="flex w-full items-center justify-between gap-3 text-left text-sm">{item.render()}</div>
                  );
                  return (
                    <li key={item.key} className="relative">
                      <span className="absolute -left-[29px] top-3 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-brand-beige bg-white text-brand-moss">
                        <Icon size={10} strokeWidth={2} aria-hidden="true" />
                      </span>
                      {item.onClick ? (
                        <button
                          type="button"
                          onClick={item.onClick}
                          className="w-full rounded-xl border border-brand-beige px-4 py-3 transition hover:border-brand-moss"
                        >
                          {body}
                        </button>
                      ) : (
                        <div className="rounded-xl border border-brand-beige px-4 py-3">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          {visible.length > limit ? (
            <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="text-sm font-medium text-brand-moss hover:underline">
              Mostrar mais ({visible.length - limit})
            </button>
          ) : null}
        </div>
      )}
    </Card>
  );
}
