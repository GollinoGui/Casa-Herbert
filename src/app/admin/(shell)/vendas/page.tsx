import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/PageHeader";
import { SalesManager } from "@/components/admin/SalesManager";
import { listSales } from "@/lib/data/sales";
import { getAllProducts } from "@/lib/data/products";
import { getAllServices } from "@/lib/data/services";
import { monthRange, parseListFilters } from "@/lib/utils/list-filters";
import { todayDateStr } from "@/lib/utils/date-format";

export const metadata: Metadata = { title: "Vendas" };

export default async function VendasPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const defaults = monthRange(todayDateStr());
  const filters = parseListFilters(searchParams, defaults);
  const [sales, products, services] = await Promise.all([
    listSales({ dateFrom: filters.dateFrom || undefined, dateTo: filters.dateTo || undefined }),
    getAllProducts(),
    getAllServices(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vendas"
        title="Vendas"
        guideKey="vendas"
        guide={[
          <>
            <strong>Nova venda</strong>: escolha o cliente, adicione produtos (pela busca ou lendo o código de barras), serviços
            ou um item avulso, e diga se foi pago agora, em parte ou se fica em aberto.
          </>,
          <>
            <strong>Registrar pelo comprovante</strong>: mande a foto do Pix ou da maquininha. O sistema lê o valor e quem
            pagou e sugere o produto pelo preço — confirme ou escolha o certo.
          </>,
          <>Toda venda baixa o estoque na hora. O que fica em aberto aparece em Contas a receber.</>,
          <>Lançou errado? Use “Cancelar venda”: o estoque volta e o valor recebido é estornado do saldo.</>,
        ]}
      />
      <SalesManager sales={sales} products={products} services={services} defaults={defaults} />
    </div>
  );
}
