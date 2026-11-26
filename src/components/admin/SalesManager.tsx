"use client";

import { EmptyState } from "@/components/admin/EmptyState";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Ban, HandCoins, MessageCircle, Plus, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea, FieldLabel } from "@/components/ui/Field";
import { FilterBar } from "@/components/admin/FilterBar";
import { SaleModal } from "@/components/admin/SaleModal";
import { ReceiptSaleModal } from "@/components/admin/ReceiptSaleModal";
import { ReceivePaymentModal } from "@/components/admin/ReceivePaymentModal";
import { SaleStatusBadge, StatTile } from "@/components/admin/FinanceBadges";
import { cancelSaleAction } from "@/lib/actions/admin/sales";
import { useFinanceOptions } from "@/components/admin/FinanceOptionsProvider";
import { buildChargeLink, openAmount } from "@/lib/finance/charge";
import { matchesText, matchesValue, parseListFilters } from "@/lib/utils/list-filters";
import { formatBRL } from "@/lib/utils/money";
import { formatShortDatePtBR } from "@/lib/utils/date-format";
import type { Product, Sale, Service } from "@/types";

interface SalesManagerProps {
  sales: Sale[];
  products: Product[];
  services: Service[];
  defaults: { dateFrom: string; dateTo: string };
}

export function filterSales(sales: Sale[], f: ReturnType<typeof parseListFilters>) {
  return sales.filter(
    (s) =>
      matchesText(f.customer, s.customer?.fullName, s.customer?.phone) &&
      (!f.productId || s.items.some((i) => i.type === "product" && i.refId === f.productId)) &&
      (!f.serviceId || s.items.some((i) => i.type === "service" && i.refId === f.serviceId)) &&
      (!f.status || s.status === f.status) &&
      matchesValue(s.totalCents, f)
  );
}

export function SalesManager({ sales, products, services, defaults }: SalesManagerProps) {
  const fin = useFinanceOptions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiving, setReceiving] = useState<Sale | null>(null);
  const [cancelling, setCancelling] = useState<Sale | null>(null);

  const filters = useMemo(() => parseListFilters(searchParams, defaults), [searchParams, defaults]);
  const visible = useMemo(() => filterSales(sales, filters), [sales, filters]);
  const active = visible.filter((s) => s.status !== "cancelled");
  const total = active.reduce((s, x) => s + x.totalCents, 0);
  const received = active.reduce((s, x) => s + x.paidCents, 0);

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setNewSaleOpen(true)}>
          <Plus size={16} /> Nova venda
        </Button>
        <Button variant="secondary" onClick={() => setReceiptOpen(true)}>
          <ReceiptText size={16} /> Registrar pelo comprovante
        </Button>
      </div>

      <FilterBar
        fields={["date", "customer", "product", "service", "value", "status"]}
        defaults={defaults}
        products={products.map((p) => ({ value: p.id, label: p.name }))}
        services={services.map((s) => ({ value: s.id, label: s.name }))}
        statuses={[
          { value: "paid", label: "Pago" },
          { value: "open", label: "Em aberto" },
          { value: "cancelled", label: "Cancelada" },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Vendas" value={String(active.length)} hint="no filtro atual" />
        <StatTile label="Total vendido" value={formatBRL(total)} />
        <StatTile label="Recebido" value={formatBRL(received)} tone="in" />
        <StatTile label="Falta receber" value={formatBRL(total - received)} tone={total - received > 0 ? "warn" : undefined} />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-brand-beige bg-white">
          <EmptyState title="Nenhuma venda encontrada" hint="Mude os filtros ou registre uma nova venda." />
        </div>
      ) : (
        <ul data-cascata className="space-y-2">
          {visible.map((sale) => (
            <li key={sale.id} className="rounded-2xl border border-brand-beige bg-white p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-brand-graphite">{sale.customer?.fullName ?? "Venda avulsa"}</p>
                    <SaleStatusBadge status={sale.status} partial={sale.paidCents > 0} />
                  </div>
                  <p className="mt-0.5 text-xs text-brand-graphite/60">
                    {formatShortDatePtBR(sale.saleDate)}
                    {sale.paymentMethod ? ` · ${fin.methodLabel(sale.paymentMethod)}` : ""}
                    {sale.appointmentId ? " · atendimento" : ""}
                  </p>
                  <p className="mt-1.5 text-brand-graphite/80">
                    {sale.items.map((i) => `${i.description}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ")}
                  </p>
                  {sale.notes ? <p className="mt-1 whitespace-pre-line text-xs text-brand-graphite/50">{sale.notes}</p> : null}
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold tabular-nums text-brand-graphite">{formatBRL(sale.totalCents)}</p>
                  {sale.discountCents > 0 ? (
                    <p className="text-xs text-brand-graphite/50">desconto {formatBRL(sale.discountCents)}</p>
                  ) : null}
                  {sale.status === "open" ? (
                    <p className="text-xs font-medium text-amber-800">falta {formatBRL(openAmount(sale))}</p>
                  ) : null}
                </div>
              </div>
              {sale.status !== "cancelled" ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-brand-beige/70 pt-3">
                  {sale.status === "open" ? (
                    <>
                      <Button className="!px-3 !py-1.5 text-xs" onClick={() => setReceiving(sale)}>
                        <HandCoins size={14} /> Receber
                      </Button>
                      {sale.customer ? (
                        <a
                          href={buildChargeLink(sale.customer.phone, sale.customer.fullName, [sale])}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary !px-3 !py-1.5 text-xs"
                        >
                          <MessageCircle size={14} /> Cobrar no WhatsApp
                        </a>
                      ) : null}
                    </>
                  ) : null}
                  <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => setCancelling(sale)}>
                    <Ban size={14} /> Cancelar venda
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <SaleModal
        open={newSaleOpen}
        onClose={() => setNewSaleOpen(false)}
        onCompleted={() => {
          setNewSaleOpen(false);
          refresh();
        }}
      />
      <ReceiptSaleModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        onCompleted={() => {
          setReceiptOpen(false);
          refresh();
        }}
      />
      <ReceivePaymentModal
        sale={receiving}
        onClose={() => setReceiving(null)}
        onCompleted={() => {
          setReceiving(null);
          refresh();
        }}
      />
      <CancelSaleModal
        sale={cancelling}
        onClose={() => setCancelling(null)}
        onCompleted={() => {
          setCancelling(null);
          refresh();
        }}
      />
    </div>
  );
}

export function CancelSaleModal({ sale, onClose, onCompleted }: { sale: Sale | null; onClose: () => void; onCompleted: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    if (!sale) return;
    setBusy(true);
    setError(null);
    const result = await cancelSaleAction(sale.id, reason.trim() || undefined);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setReason("");
    onCompleted();
  }

  return (
    <Modal open={!!sale} onClose={onClose} title="Cancelar venda">
      {sale ? (
        <div className="space-y-4">
          <p className="text-sm text-brand-graphite/80">
            Os produtos voltam para o estoque
            {sale.paidCents > 0 ? ` e o valor já recebido (${formatBRL(sale.paidCents)}) sai do saldo como estorno` : ""}. Não
            dá para desfazer.
          </p>
          <div>
            <FieldLabel htmlFor="cancel-reason">Motivo (opcional)</FieldLabel>
            <Textarea id="cancel-reason" rows={2} className="!min-h-0" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              Voltar
            </Button>
            <Button onClick={handleConfirm} disabled={busy}>
              {busy ? "Cancelando..." : "Cancelar venda"}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
