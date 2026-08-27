"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Field";
import { StatusBadge } from "@/components/ui/Badge";
import { AppointmentDetailModal } from "@/components/admin/AppointmentDetailModal";
import { listAppointmentsAction } from "@/lib/actions/admin/appointments";
import { STATUS_LABELS } from "@/lib/booking/constants";
import { formatShortDatePtBR } from "@/lib/utils/date-format";
import { cn } from "@/lib/utils/cn";
import type { AppointmentStatus, AppointmentWithRelations } from "@/types";

const ALL_STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED", "COMPLETED"];

export function AppointmentsTable() {
  const [items, setItems] = useState<AppointmentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                statusFilter.includes(status)
                  ? "border-brand-forest bg-brand-forest text-brand-cream"
                  : "border-brand-beige text-brand-graphite/70 hover:border-brand-moss"
              )}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="De" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Até" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente ou telefone..."
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-brand-beige bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-brand-beige bg-brand-cream/50 text-xs uppercase tracking-wide text-brand-graphite/60">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Horário</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Serviço</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-brand-graphite/50">
                  Carregando...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-brand-graphite/50">
                  Nenhum agendamento encontrado.
                </td>
              </tr>
            ) : (
              items.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => {
                    setSelectedId(a.id);
                    setOpen(true);
                  }}
                  className="cursor-pointer border-b border-brand-beige/60 transition hover:bg-brand-cream/40"
                >
                  <td className="px-4 py-3">{formatShortDatePtBR(a.date)}</td>
                  <td className="px-4 py-3">{a.startTime}</td>
                  <td className="px-4 py-3 font-medium text-brand-graphite">{a.customer.fullName}</td>
                  <td className="px-4 py-3">{a.service.name}</td>
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
