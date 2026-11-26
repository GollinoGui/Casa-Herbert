import type { Metadata } from "next";
import { getAllProducts } from "@/lib/data/products";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductsManager } from "@/components/admin/ProductsManager";

export const metadata: Metadata = { title: "Estoque" };

export default async function EstoquePage() {
  const products = await getAllProducts();
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
        ]}
      />
      <ProductsManager products={products} />
    </div>
  );
}
