import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/PageHeader";
import { PackagesManager } from "@/components/admin/PackagesManager";
import { listCustomerPackages, listServicePackages } from "@/lib/data/packages";
import { getActiveServices } from "@/lib/data/services";

export const metadata: Metadata = { title: "Pacotes" };

export default async function PacotesPage() {
  const [catalog, customerPackages, services] = await Promise.all([
    listServicePackages(),
    listCustomerPackages(),
    getActiveServices(),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vendas e estoque"
        title="Pacotes de sessões"
        guideKey="pacotes"
        guide={[
          <>Em <strong>Pacotes oferecidos</strong>, cadastre o protocolo: serviço, número de sessões e preço fechado.</>,
          <>
            <strong>Vender pacote</strong> registra a venda uma vez só: o dinheiro entra no caixa (ou fica a receber, se for pago
            depois).
          </>,
          <>
            No dia de cada sessão, abra o atendimento confirmado e toque em <strong>Usar sessão do pacote</strong>. O atendimento é
            concluído sem cobrar de novo.
          </>,
          <>Venda de pacote com sessão já usada não pode ser cancelada. Para devolver parte, lance um ajuste em Saldo e extrato.</>,
        ]}
      />
      <PackagesManager catalog={catalog} customerPackages={customerPackages} services={services} />
    </div>
  );
}
