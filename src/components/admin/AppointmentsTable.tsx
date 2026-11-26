"use client";

import { useEffect, useMemo, useState } from "react";
import { Input, Select } from "@/components/ui/Field";
import { listActiveServicesAction } from "@/lib/actions/admin/services";
import { formatServicePrice } from "@/lib/utils/service-format";
import { StatusBadge } from "@/components/ui/Badge";
import { AppointmentDetailModal } from "@/components/admin/AppointmentDetailModal";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { confirmAppointmentAction, listAppointmentsAction } from "@/lib/actions/admin/appointments";
import { SwipeRow } from "@/components/admin/SwipeRow";
import { EmptyState } from "@/components/admin/EmptyState";
import { toWhatsAppDigits } from "@/lib/utils/phone";
import { STATUS_LABELS } from "@/lib/booking/constants";
import { formatShortDatePtBR } from "@/lib/utils/date-format";
import { cn } from "@/lib/utils/cn";
import type { AppointmentStatus, AppointmentWithRelations, Service } from "@/types";

const ALL_STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED", "COMPLETED"];

export function AppointmentsTable({ initialStatus }: { initialStatus?: AppointmentStatus }) {
  const [items, setItems] = useState<AppointmentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus[]>(initialStatus ? [initialStatus] : []);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");

  useEffect(() => {
    listActiveServicesAction().then(setServices);
  }, []);

  const visible = useMemo(() => {
    const toCents = (v: string) => (v.trim() === "" ? null : Math.round(Number(v.replace(",", ".")) * 100));
    const min = toCents(minValue);
    const max = toCents(maxValue);
    return items.filter((a) => {
      const value = (a.priceCents ?? 0) - a.discountCents;
      return (!serviceId || a.serviceId === serviceId) && (min == null || value >= min) && (max == null || value <= max);
    });
  }, [items, serviceId, minValue, maxValue]);

  function load() {
    setLoading(true);
    listAppointmentsAction({
      status: statusFilter.length ? statusFilter : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      search: search || undefined,
    }).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dateFrom, dateTo, search]);

  function toggleStatus(status: AppointmentStatus) {
    setStatusFilter((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-brand-beige bg-white p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {ALL_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-xs font-medium transition",
                statusFilter.includes(status)
                  ? "border-brand-forest bg-brand-forest text-brand-ink"
                  : "border-brand-beige text-brand-graphite/70 hover:border-brand-moss"
              )}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="De" className="min-w-0" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Até" className="min-w-0" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente ou telefone..."
            className="col-span-2 sm:col-span-1"
          />
          <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)} aria-label="Serviço" className="col-span-2 sm:col-span-1">
            <option value="">Todos os serviços</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Input inputMode="decimal" value={minValue} onChange={(e) => setMinValue(e.target.value)} placeholder="Valor de R$" aria-label="Valor mínimo" />
          <Input inputMode="decimal" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} placeholder="até R$" aria-label="Valor máximo" />
        </div>
      </div>

      {!loading && visible.length > 0 ? (
        <p className="-mb-2 text-xs text-brand-graphite/50 md:hidden">
          Dica: arraste um agendamento para a direita para confirmar, ou para a esquerda para abrir o WhatsApp.
        </p>
      ) : null}
      <ul data-cascata className="space-y-2 md:hidden">
        {loading ? (
          [0, 1, 2].map((i) => (
            <li key={i} className="h-[84px] animate-pulse rounded-2xl border border-brand-beige bg-white/60" aria-hidden="true" />
          ))
        ) : visible.length === 0 ? (
          <li className="rounded-2xl border border-brand-beige bg-white">
            <EmptyState title="Nenhum agendamento encontrado" hint="Tente mudar os filtros ou o período." />
          </li>
        ) : (
          visible.map((a) => (
            <li key={a.id}>
              <SwipeRow
                right={
                  a.status === "PENDING"
                    ? {
                        label: "Confirmar",
                        icon: CheckCircle2,
                        tone: "leaf",
                        onTrigger: () => {
                          void confirmAppointmentAction(a.id).then(load);
                        },
                      }
                    : undefined
                }
                left={{
                  label: "WhatsApp",
                  icon: MessageCircle,
                  onTrigger: () => window.open(`https://wa.me/${toWhatsAppDigits(a.customer.phone)}`, "_blank", "noopener"),
                }}
              >
                <button
                  onClick={() => {
                    setSelectedId(a.id);
                    setOpen(true);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-brand-beige bg-white px-4 py-3.5 text-left text-sm transition active:bg-brand-cream"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-brand-graphite">{a.customer.fullName}</p>
                    <p className="truncate text-xs text-brand-graphite/60">{a.service.name}</p>
                    <p className="mt-1 text-xs font-medium tabular-nums text-brand-graphite/80">
                      {formatShortDatePtBR(a.date)} · {a.startTime}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </button>
              </SwipeRow>
            </li>
          ))
        )}
      </ul>

      <div className="hidden overflow-x-auto rounded-2xl border border-brand-beige bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-beige bg-brand-cream/50 text-xs uppercase tracking-wide text-brand-graphite/60">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Horário</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Serviço</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody data-cascata>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-brand-graphite/50">
                  Carregando...
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState title="Nenhum agendamento encontrado" hint="Tente mudar os filtros ou o período." />
                </td>
              </tr>
            ) : (
              visible.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => {
                    setSelectedId(a.id);
                    setOpen(true);
                  }}
                  className="cursor-pointer border-b border-brand-beige/60 transition-colors hover:bg-brand-sage/10"
                >
                  <td className="px-4 py-3">{formatShortDatePtBR(a.date)}</td>
                  <td className="px-4 py-3">{a.startTime}</td>
                  <td className="px-4 py-3 font-medium text-brand-graphite">{a.customer.fullName}</td>
                  <td className="px-4 py-3">{a.service.name}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {a.priceCents == null ? "—" : formatServicePrice(a.priceCents - a.discountCents)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AppointmentDetailModal
        appointmentId={selectedId}
        open={open}
        onClose={() => setOpen(false)}
        onMutated={load}
      />
    </div>
  );
}
