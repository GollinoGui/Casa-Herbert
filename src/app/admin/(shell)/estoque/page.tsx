import type { Metadata } from "next";
import { getAllProducts, getStockForecast, type StockForecast } from "@/lib/data/products";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductsManager } from "@/components/admin/ProductsManager";

export const metadata: Metadata = { title: "Estoque" };

export default async function EstoquePage() {
  const [products, forecast] = await Promise.all([
    getAllProducts(),
    // Previsão é ajuda, não pode derrubar a página.
    getStockForecast().catch((error): Record<string, StockForecast> => {
      console.error("[estoque] previsão:", error instanceof Error ? error.message : error);
      return {};
    }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Estoque"
        title="Produtos e estoque"
        guideKey="estoque"
        guide={[
          <>
            <strong>Novo produto</strong>: nome, preço de venda e, se tiver, o código de barras (digite ou leia com a câmera).
          </>,
          <>
            <strong>Ler código de barras</strong> encontra o produto na hora. Se o código não existir, abre o cadastro já
            preenchido.
          </>,
          <>O estoque baixa sozinho em cada venda e sobe em cada compra. Editar a quantidade aqui é só para acertar a contagem.</>,
          <>Produtos com 3 unidades ou menos aparecem em vermelho. Use o filtro “Estoque baixo” para montar o pedido.</>,
          <>
            <strong>Acaba em ~N dias</strong> é a previsão pelo uso dos últimos 30 dias: vendas mais o que os serviços gastam (a
            receita de cada serviço).
          </>,
        ]}
      />
      <ProductsManager products={products} forecast={forecast} />
    </div>
  );
}
