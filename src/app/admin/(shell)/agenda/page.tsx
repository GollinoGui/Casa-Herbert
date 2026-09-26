import type { Metadata } from "next";
import { CalendarView } from "@/components/admin/CalendarView";

export const metadata: Metadata = { title: "Agenda" };

export default function AgendaPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Agenda</p>
        <h1 className="font-serif text-2xl text-brand-forest sm:text-3xl">Calendário de agendamentos</h1>
      </div>
      <CalendarView />
    </div>
  );
}
