import type { Metadata } from "next";
import { getCustomers } from "@/lib/data/customers";
import { CustomersPanel } from "@/components/admin/CustomersPanel";
import { PageHeader } from "@/components/admin/PageHeader";
import { getPanelUser } from "@/lib/auth/require-admin";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage({ searchParams }: { searchParams: { cliente?: string } }) {
  const [customers, user] = await Promise.all([getCustomers(), getPanelUser()]);
  const isAdmin = user?.role === "admin";
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clientes"
        title="Clientes cadastrados"
        guideKey="clientes"
        guide={[
          <>Busque pelo nome ou telefone. O telefone é o que identifica o cliente (com ou sem 55, com ou sem traço).</>,
          ...(isAdmin
            ? [
                <>Na ficha estão as compras, o que está em aberto e todos os agendamentos.</>,
                <>
                  <strong>Lançar pendência</strong> registra algo que o cliente levou sem pagar. <strong>Cobrar no WhatsApp</strong>{" "}
                  abre a conversa com a mensagem pronta.
                </>,
              ]
            : [<>Na ficha estão os dados, as observações e todos os agendamentos. Dá para agendar e pôr na lista de espera dali.</>]),
        ]}
      />
      {/* key: abrir outra ficha pelo link (?cliente=) enquanto já está na página troca a seleção */}
      <CustomersPanel key={searchParams.cliente} customers={customers} initialCustomerId={searchParams.cliente} />
    </div>
  );
}
