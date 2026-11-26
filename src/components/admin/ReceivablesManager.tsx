"use client";

import { EmptyState } from "@/components/admin/EmptyState";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { HandCoins, MessageCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FilterBar } from "@/components/admin/FilterBar";
import { SaleModal } from "@/components/admin/SaleModal";
import { ReceivePaymentModal } from "@/components/admin/ReceivePaymentModal";
import { StatTile } from "@/components/admin/FinanceBadges";
import { filterSales } from "@/components/admin/SalesManager";
import { buildChargeLink, openAmount } from "@/lib/finance/charge";
import { parseListFilters } from "@/lib/utils/list-filters";
import { formatBRL } from "@/lib/utils/money";
import { formatPhoneDisplay } from "@/lib/utils/phone";
import { formatShortDatePtBR, todayDateStr } from "@/lib/utils/date-format";
import { cn } from "@/lib/utils/cn";
import type { Product, Sale, Service } from "@/types";

const NO_DATES = { dateFrom: "", dateTo: "" };

export function ReceivablesManager({ sales, products, services }: { sales: Sale[]; products: Product[]; services: Service[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendingOpen, setPendingOpen] = useState(false);
  const [receiving, setReceiving] = useState<Sale | null>(null);
  const today = todayDateStr();

  const filters = useMemo(() => parseListFilters(searchParams, NO_DATES), [searchParams]);
  const visible = useMemo(
    () =>
      filterSales(sales, { ...filters, status: "" }).filter(
        (s) => (!filters.dateFrom || (s.dueDate ?? s.saleDate) >= filters.dateFrom) && (!filters.dateTo || (s.dueDate ?? s.saleDate) <= filters.dateTo)
      ),
    [sales, filters]
  );

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; phone: string | null; customerId: string | null; sales: Sale[] }>();
    for (const sale of visible) {
      const key = sale.customerId ?? "sem-cliente";
      const group = map.get(key) ?? {
        key,
        name: sale.customer?.fullName ?? "Sem cliente identificado",
        phone: sale.customer?.phone ?? null,
        customerId: sale.customerId,
        sales: [],
      };
      group.sales.push(sale);
      map.set(key, group);
    }
    return Array.from(map.values()).sort(
      (a, b) => b.sales.reduce((s, x) => s + openAmount(x), 0) - a.sales.reduce((s, x) => s + openAmount(x), 0)
    );
  }, [visible]);

  const total = visible.reduce((s, x) => s + openAmount(x), 0);
  const overdue = visible.filter((s) => s.dueDate && s.dueDate < today).reduce((s, x) => s + openAmount(x), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setPendingOpen(true)}>
          <Plus size={16} /> Lançar pendência
        </Button>
      </div>

      <FilterBar
        fields={["date", "customer", "product", "service", "value"]}
        dateLabel="Vencimento"
        defaults={NO_DATES}
        products={products.map((p) => ({ value: p.id, label: p.name }))}
        services={services.map((s) => ({ value: s.id, label: s.name }))}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Total a receber" value={formatBRL(total)} tone={total > 0 ? "warn" : undefined} />
        <StatTile label="Atrasado" value={formatBRL(overdue)} tone={overdue > 0 ? "out" : undefined} />
        <StatTile label="Clientes devendo" value={String(groups.filter((g) => g.customerId).length)} />
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-brand-beige bg-white">
          <EmptyState title="Nada a receber" hint="Tudo em dia: nenhuma venda em aberto." />
        </div>
      ) : (
        <ul className="space-y-3">
          {groups.map((group) => {
            const groupTotal = group.sales.reduce((s, x) => s + openAmount(x), 0);
            return (
              <li key={group.key} className="rounded-2xl border border-brand-beige bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {group.customerId ? (
                      <Link href={`/admin/clientes?cliente=${group.customerId}`} className="font-medium text-brand-graphite hover:underline">
                        {group.name}
                      </Link>
                    ) : (
                      <p className="font-medium text-brand-graphite">{group.name}</p>
                    )}
                    {group.phone ? <p className="text-xs text-brand-graphite/60">{formatPhoneDisplay(group.phone)}</p> : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-semibold tabular-nums text-amber-800">{formatBRL(groupTotal)}</p>
                    {group.phone ? (
                      <a
                        href={buildChargeLink(group.phone, group.name, group.sales)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary !px-3 !py-1.5 text-xs"
                      >
                        <MessageCircle size={14} /> Cobrar
                      </a>
                    ) : null}
                  </div>
                </div>
                <ul className="mt-3 divide-y divide-brand-beige/70 border-t border-brand-beige/70">
                  {group.sales.map((sale) => {
                    const late = !!sale.dueDate && sale.dueDate < today;
                    return (
                      <li key={sale.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="text-brand-graphite">
                            {sale.items.map((i) => `${i.description}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ")}
                          </p>
                          <p className="text-xs text-brand-graphite/60">
                            {formatShortDatePtBR(sale.saleDate)}
                            {sale.dueDate ? (
                              <span className={cn(late && "font-medium text-red-700")}>
                                {" "}
                                · vence {formatShortDatePtBR(sale.dueDate)}
                                {late ? " (atrasada)" : ""}
                              </span>
                            ) : null}
                            {sale.paidCents > 0 ? ` · já pagou ${formatBRL(sale.paidCents)}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium tabular-nums text-brand-graphite">{formatBRL(openAmount(sale))}</span>
                          <Button className="!px-3 !py-1.5 text-xs" onClick={() => setReceiving(sale)}>
                            <HandCoins size={14} /> Receber
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      )}

      <SaleModal
        open={pendingOpen}
        mode="pending"
        onClose={() => setPendingOpen(false)}
        onCompleted={() => {
          setPendingOpen(false);
          router.refresh();
        }}
      />
      <ReceivePaymentModal
        sale={receiving}
        onClose={() => setReceiving(null)}
        onCompleted={() => {
          setReceiving(null);
          router.refresh();
        }}
      />
    </div>
  );
}
