import type { Metadata } from "next";
import { CalendarView } from "@/components/admin/CalendarView";
import { PageHeader } from "@/components/admin/PageHeader";
import { DayRouteButton } from "@/components/admin/DayRouteButton";
import { getPanelPreferences } from "@/lib/data/settings";
import { getBusinessHours } from "@/lib/data/business-hours";
import { agendaGrid } from "@/lib/panel/preferences";
import { getPanelUser } from "@/lib/auth/require-admin";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage() {
  const [prefs, hours, user] = await Promise.all([getPanelPreferences(), getBusinessHours(), getPanelUser()]);
  const isAdmin = user?.role === "admin";
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agenda"
        title="Calendário de agendamentos"
        guideKey="agenda"
        actions={<DayRouteButton />}
        guide={[
          isAdmin ? (
            <>
              Clique no <strong>dia e horário</strong> vazio para agendar. Escolha ou cadastre o cliente, o serviço, o valor, o
              desconto e, se ele já disse que vai levar, os produtos.
            </>
          ) : (
            <>
              Clique no <strong>dia e horário</strong> vazio para agendar. Escolha ou cadastre o cliente e o serviço.
            </>
          ),
          <>Arraste um agendamento para outro horário para remarcar.</>,
          ...(isAdmin
            ? [
                <>
                  Clique num agendamento para ver os detalhes. Ao terminar o atendimento, use <strong>Finalizar e receber</strong>:
                  dá para ler o comprovante do Pix/maquininha ou lançar à mão.
                </>,
                <>Esqueceu de cobrar algo? Abra o atendimento concluído e use “Lançar algo que ficou sem pagar”.</>,
              ]
            : [<>Clique num agendamento para confirmar, mandar a confirmação no WhatsApp, remarcar ou cancelar.</>]),
          <>
            <strong>Roteiro do dia</strong> baixa um PDF com os horários, clientes e observações do dia escolhido, para imprimir
            ou mandar no WhatsApp.
          </>,
        ]}
      />
      <CalendarView grid={agendaGrid(prefs, hours)} />
    </div>
  );
}
