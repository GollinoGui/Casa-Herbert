import type { Metadata } from "next";
import { AppointmentsTable } from "@/components/admin/AppointmentsTable";
import { PageHeader } from "@/components/admin/PageHeader";
import type { AppointmentStatus } from "@/types";
import { getPanelUser } from "@/lib/auth/require-admin";

const STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED", "COMPLETED"];

export const metadata: Metadata = { title: "Agendamentos" };

export default async function AgendamentosPage({ searchParams }: { searchParams: { status?: string } }) {
  const initialStatus = STATUSES.find((s) => s === searchParams.status);
  const isAdmin = (await getPanelUser())?.role === "admin";
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agendamentos"
        title="Histórico de agendamentos"
        guideKey="agendamentos"
        guide={[
          <>Filtre por situação, período, cliente, serviço ou valor para achar um atendimento.</>,
          ...(isAdmin
            ? [
                <>Clique na linha para abrir: confirmar, finalizar e receber, remarcar valor ou cancelar.</>,
                <>
                  Num atendimento já concluído dá para lançar o que ficou sem pagar. Vai para Contas a receber com botão de cobrança
                  no WhatsApp.
                </>,
              ]
            : [<>Clique na linha para abrir: confirmar, recusar, remarcar ou cancelar.</>]),
        ]}
      />
      <AppointmentsTable key={initialStatus ?? "todos"} initialStatus={initialStatus} />
    </div>
  );
}
