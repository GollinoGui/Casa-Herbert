"use client";

import { useCallback, useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import type { EventClickArg } from "@fullcalendar/core";
import { listAppointmentsAction } from "@/lib/actions/admin/appointments";
import { AppointmentDetailModal } from "@/components/admin/AppointmentDetailModal";
import { STATUS_LABELS } from "@/lib/booking/constants";
import type { AppointmentStatus, AppointmentWithRelations } from "@/types";

const STATUS_BG: Record<AppointmentStatus, string> = {
  PENDING: "#CBB89A",
  CONFIRMED: "#EF8523",
  REJECTED: "#DC2626",
  CANCELLED: "#8A8A8A",
  COMPLETED: "#A3B89A",
};

export function CalendarView() {
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    listAppointmentsAction().then(setAppointments);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const events = appointments.map((a) => ({
    id: a.id,
    title: `${a.service.name} — ${a.customer.fullName}`,
    start: `${a.date}T${a.startTime}:00`,
    end: `${a.date}T${a.endTime}:00`,
    backgroundColor: STATUS_BG[a.status],
    borderColor: STATUS_BG[a.status],
  }));

  return (
    <div className="rounded-2xl border border-brand-beige bg-white p-4 shadow-softer sm:p-6">
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-brand-graphite/70">
        {(Object.keys(STATUS_BG) as AppointmentStatus[]).map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_BG[status] }} />
            {STATUS_LABELS[status]}
          </span>
        ))}
      </div>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        locale={ptBrLocale}
        height="auto"
        slotMinTime="07:00:00"
        slotMaxTime="21:00:00"
        allDaySlot={false}
        events={events}
        eventClick={(info: EventClickArg) => {
          setSelectedId(info.event.id);
          setOpen(true);
        }}
      />
      <AppointmentDetailModal
        appointmentId={selectedId}
        open={open}
        onClose={() => setOpen(false)}
        onMutated={load}
      />
    </div>
  );
}
