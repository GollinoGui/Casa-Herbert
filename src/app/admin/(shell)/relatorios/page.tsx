import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/PageHeader";
import { ReportsView } from "@/components/admin/ReportsView";
import { getReport } from "@/lib/data/reports";
import { parseListFilters } from "@/lib/utils/list-filters";
import { getPanelPreferences } from "@/lib/data/settings";
import { reportPeriodRange } from "@/lib/panel/preferences";
import { addDaysToDateStr, todayDateStr } from "@/lib/utils/date-format";

export const metadata: Metadata = { title: "Relatórios" };

export default async function RelatoriosPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const today = todayDateStr();
  const prefs = await getPanelPreferences();
  const defaults = reportPeriodRange(prefs.reportPeriod, today);
  const filters = parseListFilters(searchParams, defaults);
  // "Tudo" = últimos 12 meses (gráfico agrupado por mês)
  const range = { dateFrom: filters.dateFrom || addDaysToDateStr(today, -364), dateTo: filters.dateTo || today };
  const report = await getReport(range.dateFrom, range.dateTo);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title="Relatórios"
        guideKey="relatorios"
        guide={[
          <>Escolha o período no filtro (hoje, 7 dias, este mês, mês passado ou datas livres).</>,
          <>
            <strong>Ganhos</strong> mostra o dinheiro que entrou e saiu de verdade no caixa. Períodos longos são agrupados por
            mês.
          </>,
          <>
            <strong>Serviços realizados</strong> conta quantas vezes cada serviço foi feito (ex.: Corte 54, Tintura 32).
          </>,
          <>Em cada gráfico, “Ver tabela” mostra os números exatos.</>,
          <>
            <strong>Exportar PDF</strong> baixa o relatório do período escolhido, com todas as tabelas (bom para mandar ao
            contador).
          </>,
          <>
            Para esconder gráficos ou mudar o período que abre aqui, vá em <strong>Configurações › Painel e gráficos</strong>.
          </>,
        ]}
      />
      <ReportsView report={report} range={range} defaults={defaults} show={prefs.reports} rankingSize={prefs.rankingSize} />
    </div>
  );
}
