import type { Metadata } from "next";
import { getAllServices } from "@/lib/data/services";
import { ServicesManager } from "@/components/admin/ServicesManager";
import { PageHeader } from "@/components/admin/PageHeader";
import { isSiteEnabled } from "@/lib/site";
import { getActiveProducts } from "@/lib/data/products";
import { getServiceRecipes } from "@/lib/data/service-products";

export const metadata: Metadata = { title: "Serviços" };

export default async function ServicosPage() {
  const [services, recipes, products] = await Promise.all([getAllServices(), getServiceRecipes(), getActiveProducts()]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Serviços"
        title="Serviços oferecidos"
        guideKey="servicos"
        guide={[
          <>Cadastre cada serviço com duração e preço. A duração define quanto tempo ele ocupa na agenda.</>,
          <>O preço é sugerido no agendamento e na venda, mas pode ser mudado em cada atendimento.</>,
          <>
            Em <strong>Consumo</strong>, diga o que cada serviço gasta do estoque (ex.: 1 tinta, 0,5 máscara). Ao concluir o
            atendimento, o estoque baixa sozinho.
          </>,
          <>Serviço que não faz mais? Desative em vez de apagar: o histórico e os relatórios continuam certos.</>,
        ]}
      />
      <ServicesManager services={services} siteEnabled={isSiteEnabled()} recipes={recipes} products={products} />
    </div>
  );
}
