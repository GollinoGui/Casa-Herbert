"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea, FieldLabel } from "@/components/ui/Field";
import { checkoutAction } from "@/lib/actions/admin/sales";
import { listActiveProductsAction } from "@/lib/actions/admin/products";
import { listCustomersAction } from "@/lib/actions/admin/customers";
import { formatServicePrice } from "@/lib/utils/service-format";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/finance/constants";
import type { AppointmentWithRelations, Customer, PaymentMethod, Product } from "@/types";

interface ProductLine {
  productId: string;
  quantity: number;
}

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  /** Presente = checkout vinculado a um agendamento confirmado; null = venda avulsa. */
  appointment?: AppointmentWithRelations | null;
  onCompleted: () => void;
}

export function CheckoutModal({ open, onClose, appointment, onCompleted }: CheckoutModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceLinePrice, setServiceLinePrice] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<ProductLine[]>([]);
  const [pickProductId, setPickProductId] = useState("");
  const [pickQty, setPickQty] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("dinheiro");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLines([]);
    setPickProductId("");
    setPickQty(1);
    setPaymentMethod("dinheiro");
    setNotes("");
    setCustomerId("");
    setServiceLinePrice(appointment?.priceCents != null ? String(appointment.priceCents) : "");
    listActiveProductsAction().then(setProducts);
    if (!appointment) {
      listCustomersAction().then(setCustomers);
    }
  }, [open, appointment]);

  function remainingStock(product: Product) {
    const inLines = lines.find((l) => l.productId === product.id)?.quantity ?? 0;
    return product.stockQuantity - inLines;
  }

  function handleAddLine() {
    setError(null);
    const product = products.find((p) => p.id === pickProductId);
    if (!product) {
      setError("Selecione um produto.");
      return;
    }
    if (pickQty < 1 || pickQty > remainingStock(product)) {
      setError(`Quantidade indisponível — estoque restante: ${remainingStock(product)}.`);
      return;
    }
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + pickQty } : l));
      }
      return [...prev, { productId: product.id, quantity: pickQty }];
    });
    setPickProductId("");
    setPickQty(1);
  }

  function handleRemoveLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  const serviceTotalCents = appointment && serviceLinePrice.trim() !== "" ? Number(serviceLinePrice) : 0;
  const productsTotalCents = lines.reduce((sum, line) => {
    const product = products.find((p) => p.id === line.productId);
    return sum + (product ? product.priceCents * line.quantity : 0);
  }, 0);
  const grandTotalCents = serviceTotalCents + productsTotalCents;

  async function handleSubmit() {
    setError(null);
    if (appointment && serviceLinePrice.trim() === "") {
      setError("Informe o valor do serviço antes de finalizar.");
      return;
    }
    if (!appointment && lines.length === 0) {
      setError("Adicione ao menos um produto para registrar a venda.");
      return;
    }
    setSubmitting(true);
    const result = await checkoutAction({
      appointmentId: appointment?.id ?? null,
      customerId: appointment ? null : customerId || null,
      serviceLine: appointment && serviceLinePrice.trim() !== "" ? { unitPriceCents: Number(serviceLinePrice) } : null,
      productLines: lines,
      paymentMethod,
      notes: notes || null,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onCompleted();
  }

  return (
    <Modal open={open} onClose={onClose} title={appointment ? "Finalizar atendimento" : "Nova venda"} widthClassName="max-w-xl">
      <div className="space-y-5">
        {appointment ? (
          <div className="rounded-xl border border-brand-beige bg-brand-cream/40 p-4">
            <p className="text-xs uppercase tracking-wide text-brand-graphite/50">Serviço</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="font-medium text-brand-graphite">
                {appointment.service.name} — {appointment.customer.fullName}
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-32 !py-2 text-sm"
                  placeholder="Sob consulta"
                  value={serviceLinePrice}
                  onChange={(e) => setServiceLinePrice(e.target.value)}
                />
                <span className="text-xs text-brand-graphite/50">centavos</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <FieldLabel htmlFor="checkout-customer">Cliente (opcional)</FieldLabel>
            <Select id="checkout-customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Venda sem cliente identificado</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} — {c.phone}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <FieldLabel>Produtos</FieldLabel>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[200px] flex-1">
              <Select value={pickProductId} onChange={(e) => setPickProductId(e.target.value)}>
                <option value="">Selecione um produto...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} disabled={remainingStock(p) <= 0}>
                    {p.name} — {formatServicePrice(p.priceCents)} ({remainingStock(p)} em estoque)
                  </option>
                ))}
              </Select>
            </div>
            <Input
              type="number"
              min={1}
              className="w-20 !py-3"
              value={pickQty}
              onChange={(e) => setPickQty(Number(e.target.value))}
            />
            <Button type="button" variant="secondary" className="!px-4 !py-3" onClick={handleAddLine}>
              <Plus size={16} />
            </Button>
          </div>

          {lines.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {lines.map((line) => {
                const product = products.find((p) => p.id === line.productId);
                if (!product) return null;
                return (
                  <li
                    key={line.productId}
                    className="flex items-center justify-between rounded-xl border border-brand-beige px-3 py-2 text-sm"
                  >
                    <span>
                      {product.name} × {line.quantity}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-brand-graphite">
                        {formatServicePrice(product.priceCents * line.quantity)}
                      </span>
                      <button
                        onClick={() => handleRemoveLine(line.productId)}
                        className="text-brand-graphite/50 hover:text-red-600"
                        aria-label="Remover"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <div>
          <FieldLabel htmlFor="payment-method">Forma de pagamento</FieldLabel>
          <Select
            id="payment-method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {PAYMENT_METHOD_LABELS[method]}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <FieldLabel htmlFor="checkout-notes">Observações (opcional)</FieldLabel>
          <Textarea id="checkout-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex items-center justify-between border-t border-brand-beige pt-4">
          <span className="font-serif text-lg text-brand-forest">Total</span>
          <span className="font-serif text-xl text-brand-forest">{formatServicePrice(grandTotalCents)}</span>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Finalizando..." : "Finalizar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
