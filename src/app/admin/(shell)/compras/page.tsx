import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/PageHeader";
import { PurchasesManager } from "@/components/admin/PurchasesManager";
import { listPurchases } from "@/lib/data/purchases";
import { getAllProducts } from "@/lib/data/products";
import { monthRange, parseListFilters } from "@/lib/utils/list-filters";
import { todayDateStr } from "@/lib/utils/date-format";

export const metadata: Metadata = { title: "Compras" };

export default async function ComprasPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const defaults = monthRange(todayDateStr());
  const filters = parseListFilters(searchParams, defaults);
  const [purchases, products] = await Promise.all([
    listPurchases({ dateFrom: filters.dateFrom || undefined, dateTo: filters.dateTo || undefined }),
    getAllProducts(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Estoque"
        title="Compras"
        guideKey="compras"
        guide={[
          <>
            Chegou mercadoria? Clique em <strong>Nova compra</strong> e adicione os produtos pela busca ou lendo o código de
            barras com a câmera.
          </>,
          <>Código que ainda não existe? O sistema pede o nome e o preço e já cadastra o produto.</>,
          <>Informe quantidade e custo de cada item. O estoque aumenta na hora e o custo fica salvo no produto.</>,
          <>
            Pagou na hora? Marque <strong>Já paguei</strong> e o valor sai do saldo. Se for a prazo, a compra vai para Contas a
            pagar com o vencimento.
          </>,
        ]}
      />
      <PurchasesManager purchases={purchases} products={products} defaults={defaults} />
    </div>
  );
}
