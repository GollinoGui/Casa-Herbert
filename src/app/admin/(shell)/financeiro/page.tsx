import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/PageHeader";
import { FinanceiroManager } from "@/components/admin/FinanceiroManager";
import { getBalance, getStatement } from "@/lib/data/financials";
import { monthRange, parseListFilters } from "@/lib/utils/list-filters";
import { todayDateStr } from "@/lib/utils/date-format";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinanceiroPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const today = todayDateStr();
  const defaults = monthRange(today);
  const filters = parseListFilters(searchParams, defaults);
  // "Tudo" no filtro de data = desde o primeiro lançamento até hoje.
  const [balanceCents, statement] = await Promise.all([
    getBalance(),
    getStatement(filters.dateFrom || "2000-01-01", filters.dateTo || today),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title="Saldo e extrato"
        guideKey="financeiro"
        guide={[
          <>
            Primeira vez? Clique em <strong>Ajustar saldo → Definir saldo</strong> e informe quanto tem hoje no caixa e no
            banco. A partir daí o sistema soma e subtrai sozinho.
          </>,
          <>Entram no saldo: vendas pagas e pendências recebidas. Saem: contas pagas e compras pagas.</>,
          <>
            O saldo atravessa os meses: se novembro fechou com R$ 12.000 e dezembro teve R$ 2.000 de contas, o saldo fica em
            R$ 10.000.
          </>,
          <>Use o filtro de período para ver o extrato de um mês. Cada linha mostra o saldo depois daquele lançamento.</>,
        ]}
      />
      <FinanceiroManager balanceCents={balanceCents} statement={statement} defaults={defaults} />
    </div>
  );
}
