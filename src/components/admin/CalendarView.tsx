"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import type { EventClickArg, EventDropArg } from "@fullcalendar/core";
import { Plus } from "lucide-react";
import { listAppointmentsAction, adminRescheduleAppointmentAction } from "@/lib/actions/admin/appointments";
import { AppointmentDetailModal } from "@/components/admin/AppointmentDetailModal";
import { NewAppointmentModal } from "@/components/admin/NewAppointmentModal";
import { Button } from "@/components/ui/Button";
import { STATUS_LABELS } from "@/lib/booking/constants";
import { formatDateOnly, formatTimeOnly } from "@/lib/utils/date-format";
import type { AppointmentStatus, AppointmentWithRelations } from "@/types";

const EDITABLE_STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED"];

const STATUS_BG: Record<AppointmentStatus, string> = {
  PENDING: "#CBB89A",
  CONFIRMED: "#EF8523",
  REJECTED: "#DC2626",
  CANCELLED: "#8A8A8A",
  COMPLETED: "#A3B89A",
};

const MOBILE_QUERY = "(max-width: 640px)";

export function CalendarView() {
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newPrefill, setNewPrefill] = useState<{ date?: string; startTime?: string }>({});
  const [dragError, setDragError] = useState<string | null>(null);
  const calendarRef = useRef<FullCalendar | null>(null);

  const load = useCallback(() => {
    listAppointmentsAction().then(setAppointments);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const applyView = (isMobile: boolean) => {
      calendarRef.current?.getApi().changeView(isMobile ? "timeGridDay" : "timeGridWeek");
    };
    applyView(mql.matches);
    const onChange = (e: MediaQueryListEvent) => applyView(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const events = appointments.map((a) => ({
    id: a.id,
    title: `${a.service.name} — ${a.customer.fullName}`,
    start: `${a.date}T${a.startTime}:00`,
    end: `${a.date}T${a.endTime}:00`,
    backgroundColor: STATUS_BG[a.status],
    borderColor: STATUS_BG[a.status],
    startEditable: EDITABLE_STATUSES.includes(a.status),
  }));

  function openNewAppointment(date?: string, startTime?: string) {
    setNewPrefill({ date, startTime });
    setNewOpen(true);
  }

  async function handleEventDrop(info: EventDropArg) {
    setDragError(null);
    const date = formatDateOnly(info.event.start!);
    const startTime = formatTimeOnly(info.event.start!);
    const result = await adminRescheduleAppointmentAction(info.event.id, date, startTime);
    if (!result.ok) {
      info.revert();
      setDragError(
        result.error === "SLOT_NO_LONGER_AVAILABLE"
          ? "Esse horário não está disponível — o agendamento foi mantido no horário original."
          : result.error
      );
      return;
    }
    load();
  }

  return (
    <div className="rounded-2xl border border-brand-beige bg-white p-4 shadow-softer sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-brand-graphite/70">
          {(Object.keys(STATUS_BG) as AppointmentStatus[]).map((status) => (
            <span key={status} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_BG[status] }} />
              {STATUS_LABELS[status]}
            </span>
          ))}
        </div>
        <Button className="!px-4 !py-2 text-xs" onClick={() => openNewAppointment()}>
          <Plus size={14} /> Novo agendamento
        </Button>
      </div>
      {dragError ? <p className="mb-3 text-sm text-red-600">{dragError}</p> : null}
      <FullCalendar
        ref={calendarRef}
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
        eventStartEditable
        eventDurationEditable={false}
        eventDrop={handleEventDrop}
        dateClick={(info: DateClickArg) => {
          openNewAppointment(formatDateOnly(info.date), formatTimeOnly(info.date));
        }}
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
      <NewAppointmentModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        initialDate={newPrefill.date}
        initialStartTime={newPrefill.startTime}
        onCreated={() => {
          setNewOpen(false);
          load();
        }}
      />
    </div>
  );
}
