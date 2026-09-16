"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock, CalendarRange, Users, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/motion/FadeIn";
import { AppointmentDetailModal } from "@/components/admin/AppointmentDetailModal";
import { CalendarView } from "@/components/admin/CalendarView";
import { formatShortDatePtBR } from "@/lib/utils/date-format";
import { formatServicePrice } from "@/lib/utils/service-format";
import type { AppointmentWithRelations } from "@/types";

interface DashboardStats {
  todayCount: number;
  pendingCount: number;
  confirmedCount: number;
  weekCount: number;
  monthCount: number;
  upcoming: AppointmentWithRelations[];
  todayAppointments: AppointmentWithRelations[];
}

export function DashboardOverview({
  stats,
  todayRevenueCents,
}: {
  stats: DashboardStats;
  todayRevenueCents: number;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const statCards = [
    { label: "Hoje", value: stats.todayCount, icon: CalendarDays },
    { label: "Pendentes", value: stats.pendingCount, icon: Clock },
    { label: "Confirmados", value: stats.confirmedCount, icon: CheckCircle2 },
    { label: "Próximos 7 dias", value: stats.weekCount, icon: CalendarRange },
    { label: "Próximos 30 dias", value: stats.monthCount, icon: Users },
    { label: "Faturamento hoje", value: formatServicePrice(todayRevenueCents), icon: Wallet },
  ];

  function openAppointment(id: string) {
    setSelectedId(id);
    setOpen(true);
  }

  return (
    <div className="space-y-8">
      <FadeIn>
        <div>
          <p className="eyebrow mb-2">Painel administrativo</p>
          <h1 className="font-serif text-3xl text-brand-forest">Visão geral</h1>
        </div>
      </FadeIn>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-5">
            <Icon className="mb-3 text-brand-moss" size={20} strokeWidth={1.75} />
            <p className="text-2xl font-semibold text-brand-forest">{value}</p>
            <p className="text-xs text-brand-graphite/70">{label}</p>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-4 font-serif text-lg text-brand-forest">Calendário</h2>
        <CalendarView />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-serif text-lg text-brand-forest">Agendamentos de hoje</h2>
          {stats.todayAppointments.length === 0 ? (
            <p className="text-sm text-brand-graphite/60">Nenhum agendamento para hoje.</p>
          ) : (
            <ul className="space-y-2">
              {stats.todayAppointments.map((a) => (
                <AppointmentRow key={a.id} appointment={a} onClick={() => openAppointment(a.id)} />
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-serif text-lg text-brand-forest">Próximos agendamentos</h2>
          {stats.upcoming.length === 0 ? (
            <p className="text-sm text-brand-graphite/60">Nenhum agendamento futuro.</p>
          ) : (
            <ul className="space-y-2">
              {stats.upcoming.map((a) => (
                <AppointmentRow key={a.id} appointment={a} showDate onClick={() => openAppointment(a.id)} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <AppointmentDetailModal
        appointmentId={selectedId}
        open={open}
        onClose={() => setOpen(false)}
        onMutated={() => router.refresh()}
      />
    </div>
  );
}

function AppointmentRow({
  appointment,
  onClick,
  showDate,
}: {
  appointment: AppointmentWithRelations;
  onClick: () => void;
  showDate?: boolean;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-brand-beige bg-white px-4 py-3 text-left text-sm transition hover:border-brand-moss"
      >
        <div>
          <p className="font-medium text-brand-graphite">{appointment.customer.fullName}</p>
          <p className="text-xs text-brand-graphite/60">
            {appointment.service.name} · {showDate ? `${formatShortDatePtBR(appointment.date)} · ` : ""}
            {appointment.startTime}
          </p>
        </div>
        <StatusBadge status={appointment.status} />
      </button>
    </li>
  );
}
