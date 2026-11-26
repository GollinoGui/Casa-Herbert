import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/PageHeader";
import { PayablesManager } from "@/components/admin/PayablesManager";
import { generateRecurringPayables, listPayables, listRecurringBills } from "@/lib/data/payables";
import { monthRange, parseListFilters } from "@/lib/utils/list-filters";
import { addDaysToDateStr, todayDateStr } from "@/lib/utils/date-format";

export const metadata: Metadata = { title: "Contas a pagar" };

export default async function ContasAPagarPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const today = todayDateStr();
  const defaults = monthRange(today);
  const filters = parseListFilters(searchParams, defaults);

  // As contas fixas deste mês e do próximo já aparecem (idempotente — pode rodar sempre).
  await Promise.all([
    generateRecurringPayables(today),
    generateRecurringPayables(addDaysToDateStr(defaults.dateTo, 1)),
  ]);
  const [payables, recurringBills] = await Promise.all([
    listPayables({ dateFrom: filters.dateFrom || undefined, dateTo: filters.dateTo || undefined }),
    listRecurringBills(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title="Contas a pagar"
        guideKey="contas-a-pagar"
        guide={[
          <>
            Cadastre em <strong>Contas fixas</strong> o que se repete todo mês (água, luz, aluguel, internet). O sistema cria a
            conta de cada mês sozinho.
          </>,
          <>
            Conta avulsa (um conserto, um boleto)? Use <strong>Nova conta</strong>. Compras de produtos entram aqui
            automaticamente pela tela Compras.
          </>,
          <>
            Ao pagar, clique em <strong>Pagar</strong> e confira o valor da fatura. O valor sai do saldo na data do
            pagamento.
          </>,
          <>Contas em aberto aparecem sempre, mesmo de meses anteriores. Atrasadas ficam em vermelho.</>,
        ]}
      />
      <PayablesManager payables={payables} recurringBills={recurringBills} defaults={defaults} />
    </div>
  );
}
