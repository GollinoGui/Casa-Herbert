import type { Metadata } from "next";
import { getCustomers } from "@/lib/data/customers";
import { CustomersPanel } from "@/components/admin/CustomersPanel";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage({ searchParams }: { searchParams: { cliente?: string } }) {
  const customers = await getCustomers();
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Clientes</p>
        <h1 className="font-serif text-2xl text-brand-forest sm:text-3xl">Clientes cadastrados</h1>
      </div>
      {/* key: abrir outra ficha pelo link (?cliente=) enquanto já está na página troca a seleção */}
      <CustomersPanel key={searchParams.cliente} customers={customers} initialCustomerId={searchParams.cliente} />
    </div>
  );
}
