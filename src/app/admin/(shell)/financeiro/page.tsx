import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { FinanceiroManager } from "@/components/admin/FinanceiroManager";
import { CashClosingPanel } from "@/components/admin/CashClosingPanel";
import { getBalance, getStatement } from "@/lib/data/financials";
import { getCashDrawerPreview, listCashClosings } from "@/lib/data/cash-closings";
import { monthRange, parseListFilters } from "@/lib/utils/list-filters";
import { todayDateStr } from "@/lib/utils/date-format";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Financeiro" };

const TABS = [
  { value: "extrato", label: "Saldo e extrato" },
  { value: "fechamento", label: "Fechamento do caixa" },
] as const;

export default async function FinanceiroPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const tab = searchParams.aba === "fechamento" ? "fechamento" : "extrato";
  const today = todayDateStr();
  const defaults = monthRange(today);

  const tabs = (
    <nav className="inline-flex rounded-xl bg-brand-cream/70 p-1" aria-label="Financeiro">
      {TABS.map((t) => (
        <Link
          key={t.value}
          href={t.value === "extrato" ? "/admin/financeiro" : "/admin/financeiro?aba=fechamento"}
          aria-current={tab === t.value ? "page" : undefined}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium transition",
            tab === t.value ? "bg-white text-brand-forest shadow-softer" : "text-brand-graphite/70 hover:text-brand-graphite"
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );

  if (tab === "fechamento") {
    const [preview, closings] = await Promise.all([getCashDrawerPreview(), listCashClosings()]);
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Financeiro"
          title="Fechamento do caixa"
          guideKey="fechamento"
          guide={[
            <>No fim do dia, conte o dinheiro da gaveta e informe o valor. Pix e cartão não entram aqui: só espécie.</>,
            <>O sistema compara com o que deveria ter: o que ficou no último fechamento, mais as entradas e menos as saídas em dinheiro.</>,
            <>
              Se levar dinheiro para o banco, informe em <strong>Levei para o banco</strong>. O saldo total não muda, só a gaveta.
            </>,
            <>Sobrou ou faltou? Você escolhe se lança a diferença no saldo como ajuste.</>,
          ]}
        />
        {tabs}
        <CashClosingPanel preview={preview} closings={closings} />
      </div>
    );
  }

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
      {tabs}
      <FinanceiroManager balanceCents={balanceCents} statement={statement} defaults={defaults} />
    </div>
  );
}
