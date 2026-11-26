import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/PageHeader";
import { ReceivablesManager } from "@/components/admin/ReceivablesManager";
import { listOpenSales } from "@/lib/data/sales";
import { getAllProducts } from "@/lib/data/products";
import { getAllServices } from "@/lib/data/services";

export const metadata: Metadata = { title: "Contas a receber" };

export default async function ContasAReceberPage() {
  const [sales, products, services] = await Promise.all([listOpenSales(), getAllProducts(), getAllServices()]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title="Contas a receber"
        guideKey="contas-a-receber"
        guide={[
          <>Aqui fica tudo que algum cliente ainda deve, agrupado por cliente e com o vencimento.</>,
          <>
            Esqueceu de cobrar um produto? Use <strong>Lançar pendência</strong> (ou o botão na ficha do cliente / no
            agendamento). O produto sai do estoque e o valor entra aqui.
          </>,
          <>
            <strong>Cobrar</strong> abre o WhatsApp do cliente com a mensagem pronta e a lista do que está em aberto.
          </>,
          <>
            Quando ele pagar, clique em <strong>Receber</strong> (dá para ler o comprovante). Pagamento parcial também vale: o
            resto continua aqui. O valor recebido entra no saldo.
          </>,
        ]}
      />
      <ReceivablesManager sales={sales} products={products} services={services} />
    </div>
  );
}
