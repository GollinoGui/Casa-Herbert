import type { Metadata } from "next";
import { getAllProducts } from "@/lib/data/products";
import { ProductsManager } from "@/components/admin/ProductsManager";

export const metadata: Metadata = { title: "Estoque" };

export default async function EstoquePage() {
  const products = await getAllProducts();
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Estoque</p>
        <h1 className="font-serif text-2xl text-brand-forest sm:text-3xl">Produtos</h1>
      </div>
      <ProductsManager products={products} />
    </div>
  );
}
