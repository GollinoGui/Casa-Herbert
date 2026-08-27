import type { Metadata } from "next";
import { getCustomers } from "@/lib/data/customers";
import { CustomersPanel } from "@/components/admin/CustomersPanel";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const customers = await getCustomers();
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Clientes</p>
        <h1 className="font-serif text-3xl text-brand-forest">Clientes cadastrados</h1>
      </div>
      <CustomersPanel customers={customers} />
    </div>
  );
}
