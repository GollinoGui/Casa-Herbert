"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Wallet, CalendarRange, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CheckoutModal } from "@/components/admin/CheckoutModal";
import { formatServicePrice } from "@/lib/utils/service-format";
import { PAYMENT_METHOD_LABELS } from "@/lib/finance/constants";
import type { Customer, Sale } from "@/types";

interface FinancialSummary {
  todayTotalCents: number;
  weekTotalCents: number;
  monthTotalCents: number;
  todayCount: number;
  weekCount: number;
  monthCount: number;
}

function formatSaleDateTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function FinanceiroManager({
  summary,
  sales,
  customers,
}: {
  summary: FinancialSummary;
  sales: Sale[];
  customers: Customer[];
}) {
  const router = useRouter();
  const [newSaleOpen, setNewSaleOpen] = useState(false);

  const statCards = [
    { label: "Hoje", value: summary.todayTotalCents, count: summary.todayCount, icon: Wallet },
    { label: "Últimos 7 dias", value: summary.weekTotalCents, count: summary.weekCount, icon: CalendarRange },
    { label: "Últimos 30 dias", value: summary.monthTotalCents, count: summary.monthCount, icon: CalendarDays },
  ];

  function customerName(sale: Sale) {
    if (!sale.customerId) return "Venda avulsa";
    return customers.find((c) => c.id === sale.customerId)?.fullName ?? "Cliente removido";
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setNewSaleOpen(true)}>
          <Plus size={16} /> Nova venda
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map(({ label, value, count, icon: Icon }) => (
          <Card key={label} className="p-5">
            <Icon className="mb-3 text-brand-moss" size={20} strokeWidth={1.75} />
            <p className="text-2xl font-semibold text-brand-forest">{formatServicePrice(value)}</p>
            <p className="text-xs text-brand-graphite/70">
              {label} · {count} {count === 1 ? "venda" : "vendas"}
            </p>
          </Card>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-brand-beige bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-brand-beige bg-brand-cream/50 text-xs uppercase tracking-wide text-brand-graphite/60">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Itens</th>
              <th className="px-4 py-3">Pagamento</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-brand-graphite/50">
                  Nenhuma venda registrada.
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id} className="border-b border-brand-beige/60">
                  <td className="px-4 py-3">{formatSaleDateTime(sale.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-brand-graphite">{customerName(sale)}</td>
                  <td className="px-4 py-3 text-brand-graphite/80">
                    {sale.items.map((i) => `${i.description}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ")}
                  </td>
                  <td className="px-4 py-3">{PAYMENT_METHOD_LABELS[sale.paymentMethod]}</td>
                  <td className="px-4 py-3 text-right font-medium text-brand-graphite">
                    {formatServicePrice(sale.totalCents)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CheckoutModal
        open={newSaleOpen}
        onClose={() => setNewSaleOpen(false)}
        appointment={null}
        onCompleted={() => {
          setNewSaleOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
