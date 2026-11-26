"use client";

import { useCallback, useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
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
import type { AgendaGrid } from "@/lib/panel/preferences";
import { useDevicePrefs, useDevicePrefsReady } from "@/lib/panel/device";

const EDITABLE_STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED"];

const STATUS_BG: Record<AppointmentStatus, string> = {
  PENDING: "#CBB89A",
  CONFIRMED: "#EF8523",
  REJECTED: "#DC2626",
  CANCELLED: "#8A8A8A",
  COMPLETED: "#7FA383",
};

const MOBILE_QUERY = "(max-width: 640px)";

const DEFAULT_GRID: AgendaGrid = { slotMinutes: 30, slotMinTime: "07:00:00", slotMaxTime: "21:00:00" };

function slotDuration(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
}

/** `grid` vem das Configurações do salão; a visão inicial (dia/semana/mês) é escolha deste aparelho. */
export function CalendarView({ grid = DEFAULT_GRID }: { grid?: AgendaGrid }) {
  const { agendaView } = useDevicePrefs();
  const prefsReady = useDevicePrefsReady();
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newPrefill, setNewPrefill] = useState<{ date?: string; startTime?: string }>({});
  const [dragError, setDragError] = useState<string | null>(null);
  const calendarRef = useRef<FullCalendar | null>(null);
  const swipeStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const [slide, setSlide] = useState<{ dir: "prox" | "ant"; key: number } | null>(null);

  const load = useCallback(() => {
    listAppointmentsAction().then(setAppointments);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!prefsReady) return;
    const api = () => calendarRef.current?.getApi();
    if (agendaView !== "auto") {
      api()?.changeView(agendaView);
      return;
    }
    const mql = window.matchMedia(MOBILE_QUERY);
    const applyView = (isMobile: boolean) => api()?.changeView(isMobile ? "timeGridDay" : "timeGridWeek");
    applyView(mql.matches);
    const onChange = (e: MediaQueryListEvent) => applyView(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [agendaView, prefsReady]);

  const events = appointments.map((a) => ({
    id: a.id,
    title: `${a.service.name} — ${a.customer.fullName}`,
    start: `${a.date}T${a.startTime}:00`,
    end: `${a.date}T${a.endTime}:00`,
    backgroundColor: STATUS_BG[a.status],
    borderColor: STATUS_BG[a.status],
    startEditable: EDITABLE_STATUSES.includes(a.status),
  }));

  // Arrastar para o lado troca de dia/semana. Gesto curto e mais horizontal que vertical,
  // para não confundir com a rolagem nem com o arrastar de um evento (toque longo no FullCalendar).
  function onTouchStart(e: ReactTouchEvent) {
    const t = e.touches[0];
    swipeStart.current = e.touches.length === 1 ? { x: t.clientX, y: t.clientY, t: Date.now() } : null;
  }

  function onTouchEnd(e: ReactTouchEvent) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || (e.target as Element).closest(".fc-event-dragging, .fc-event-resizing")) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6 || Date.now() - start.t > 650) return;
    const api = calendarRef.current?.getApi();
    if (!api) return;
    if (dx < 0) api.next();
    else api.prev();
    setSlide({ dir: dx < 0 ? "prox" : "ant", key: Date.now() });
  }

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
    <div
      className={`rounded-[22px] border border-brand-beige bg-white p-4 shadow-softer sm:p-6 ${slide ? `agenda-vai-${slide.dir}` : ""}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onAnimationEnd={(e) => {
        if (e.animationName.startsWith("agenda-entra")) setSlide(null);
      }}
    >
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
      <p className="mb-2 text-xs text-brand-graphite/50 sm:hidden">Arraste para o lado para ver o dia anterior ou o próximo.</p>
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
        slotMinTime={grid.slotMinTime}
        slotMaxTime={grid.slotMaxTime}
        slotDuration={slotDuration(grid.slotMinutes)}
        snapDuration={slotDuration(Math.min(grid.slotMinutes, 30))}
        allDaySlot={false}
        events={events}
        eventStartEditable
        eventTextColor="#19241D"
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
