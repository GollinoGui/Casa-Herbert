import type { Metadata } from "next";
import { getFinancialSummary } from "@/lib/data/financials";
import { listSales } from "@/lib/data/sales";
import { getCustomers } from "@/lib/data/customers";
import { FinanceiroManager } from "@/components/admin/FinanceiroManager";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinanceiroPage() {
  const [summary, sales, customers] = await Promise.all([getFinancialSummary(), listSales(), getCustomers()]);
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Financeiro</p>
        <h1 className="font-serif text-3xl text-brand-forest">Vendas e faturamento</h1>
      </div>
      <FinanceiroManager summary={summary} sales={sales} customers={customers} />
    </div>
  );
}
