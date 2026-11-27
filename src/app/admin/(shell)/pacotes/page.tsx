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
            depois). Em seguida, marque os dias: primeira data, horário e frequência (ex.: toda terça às 10h).
          </>,
          <>
            No dia de cada sessão, abra o atendimento e toque em <strong>Concluir sessão</strong>. Para mudar o dia, use{" "}
            <strong>Remarcar</strong>.
          </>,
          <>
            Se a cliente desmarcar ou faltar, toque em <strong>Desmarcou ou faltou</strong> e escolha: a sessão conta ou volta para o
            pacote (aí é só marcar a reposição).
          </>,
          <>Venda de pacote com sessão já usada não pode ser cancelada. Para devolver parte, lance um ajuste em Saldo e extrato.</>,
        ]}
      />
      <PackagesManager catalog={catalog} customerPackages={customerPackages} services={services} />
    </div>
  );
}
