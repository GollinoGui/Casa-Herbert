import type { Metadata } from "next";
import { AppointmentsTable } from "@/components/admin/AppointmentsTable";

export const metadata: Metadata = { title: "Agendamentos" };

export default function AgendamentosPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Agendamentos</p>
        <h1 className="font-serif text-2xl text-brand-forest sm:text-3xl">Todos os agendamentos</h1>
      </div>
      <AppointmentsTable />
    </div>
  );
}
