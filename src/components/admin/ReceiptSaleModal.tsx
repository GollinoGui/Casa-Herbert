"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Check, HandCoins, Package, Scissors, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, FieldLabel } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { ReceiptButton } from "@/components/admin/ReceiptButton";
import { CustomerPicker } from "@/components/admin/CustomerPicker";
import { ProductSearch } from "@/components/admin/SaleModal";
import { registerSaleAction, receiveSalePaymentAction } from "@/lib/actions/admin/sales";
import { listActiveProductsAction } from "@/lib/actions/admin/products";
import { listActiveServicesAction } from "@/lib/actions/admin/services";
import { listCustomersAction } from "@/lib/actions/admin/customers";
import { getAppointmentProductsAction } from "@/lib/actions/admin/appointments";
import type { ReadReceiptActionResult } from "@/lib/actions/admin/receipts";
import { useFinanceOptions } from "@/components/admin/FinanceOptionsProvider";
import { formatBRL } from "@/lib/utils/money";
import { formatShortDatePtBR, todayDateStr } from "@/lib/utils/date-format";
import { cn } from "@/lib/utils/cn";
import type { AppointmentProduct, AppointmentWithRelations, Customer, PaymentMethod, Product, Sale, Service } from "@/types";

type Read = Extract<ReadReceiptActionResult, { ok: true }>;

/** O que o comprovante pagou. */
type Target =
  | { kind: "product"; product: Product; quantity: number }
  | { kind: "service"; service: Service }
  | { kind: "custom"; description: string }
  | { kind: "openSale"; sale: Sale }
  | { kind: "appointment"; appointment: AppointmentWithRelations };

interface ReceiptSaleModalProps {
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

function describe(target: Target) {
  switch (target.kind) {
    case "product":
      return `${target.quantity > 1 ? `${target.quantity}× ` : ""}${target.product.name}`;
    case "service":
      return target.service.name;
    case "custom":
      return target.description || "Item avulso";
    case "openSale":
      return `Pendência de ${target.sale.customer?.fullName ?? "cliente"}: ${target.sale.items.map((i) => i.description).join(", ")}`;
    case "appointment":
      return `Atendimento de hoje: ${target.appointment.service.name} — ${target.appointment.customer.fullName}`;
  }
}

/**
 * Registrar um pagamento a partir do comprovante: lê valor, pagador e data, sugere o
 * produto/serviço/pendência pelo valor e pergunta ao Herbert se é isso. Se não for,
 * ele escolhe o produto certo — e a venda baixa o estoque.
 */
export function ReceiptSaleModal({ open, onClose, onCompleted }: ReceiptSaleModalProps) {
  const fin = useFinanceOptions();
  const [read, setRead] = useState<Read | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [date, setDate] = useState(todayDateStr());
  const [method, setMethod] = useState<PaymentMethod>(() => fin.pickMethod());
  const [customerId, setCustomerId] = useState("");
  const [suggestion, setSuggestion] = useState<Target | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [choosing, setChoosing] = useState<"product" | "service" | "custom" | null>(null);
  const [customText, setCustomText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [apptProducts, setApptProducts] = useState<AppointmentProduct[]>([]);

  const appointmentId = target?.kind === "appointment" ? target.appointment.id : null;
  useEffect(() => {
    setApptProducts([]);
    if (!appointmentId) return;
    let alive = true;
    getAppointmentProductsAction(appointmentId).then((items) => alive && setApptProducts(items));
    return () => {
      alive = false;
    };
  }, [appointmentId]);

  useEffect(() => {
    if (!open) return;
    setRead(null);
    setTarget(null);
    setSuggestion(null);
    setChoosing(null);
    setError(null);
    setCustomText("");
    Promise.all([listCustomersAction(), listActiveProductsAction(), listActiveServicesAction()]).then(([c, p, s]) => {
      setCustomers(c);
      setProducts(p);
      setServices(s);
    });
  }, [open]);

  function handleRead(result: Read) {
    const { data, suggestions } = result;
    setRead(result);
    setAmountCents(data.amountCents);
    setDate(data.date ?? todayDateStr());
    setMethod(data.method);
    setCustomerId(suggestions.customers[0]?.id ?? "");
    setTarget(null);
    setChoosing(null);

    const first: Target | null = suggestions.openSales[0]
      ? { kind: "openSale", sale: suggestions.openSales[0] }
      : suggestions.appointments[0]
        ? { kind: "appointment", appointment: suggestions.appointments[0] }
        : suggestions.products[0]
          ? { kind: "product", ...suggestions.products[0] }
          : suggestions.services[0]
            ? { kind: "service", service: suggestions.services[0] }
            : null;
    setSuggestion(first);
    if (!first) setChoosing("product");
  }

  function pick(next: Target) {
    setTarget(next);
    setChoosing(null);
    setError(null);
    if (next.kind === "openSale" && next.sale.customerId) setCustomerId(next.sale.customerId);
    if (next.kind === "appointment") setCustomerId(next.appointment.customerId);
  }

  // Valor cheio do que foi escolhido — para avisar quando o comprovante paga só parte.
  function targetValue(t: Target): number | null {
    switch (t.kind) {
      case "product":
        return t.product.priceCents * t.quantity;
      case "service":
        return t.service.priceCents;
      case "openSale":
        return t.sale.totalCents - t.sale.paidCents;
      case "appointment":
        return (t.appointment.priceCents ?? 0) - t.appointment.discountCents;
      case "custom":
        return amountCents;
    }
  }

  async function handleSubmit() {
    if (!target || !read) return;
    setError(null);
    if (!amountCents) return setError("Informe o valor pago.");
    const txid = read.data.transactionId;
    setSubmitting(true);

    let result: { ok: boolean; error?: string };
    if (target.kind === "openSale") {
      result = await receiveSalePaymentAction({ saleId: target.sale.id, amountCents, method, date, receiptTxid: txid });
    } else {
      const full = targetValue(target) ?? amountCents;
      if (amountCents > full) {
        setSubmitting(false);
        return setError(`O comprovante (${formatBRL(amountCents)}) é maior que o item (${formatBRL(full)}). Ajuste o valor do item ou escolha outro.`);
      }
      if (amountCents < full && !customerId) {
        setSubmitting(false);
        return setError("O comprovante paga só uma parte. Escolha o cliente para o restante ficar a receber.");
      }
      const item =
        target.kind === "product"
          ? { type: "product" as const, productId: target.product.id, quantity: target.quantity }
          : target.kind === "service"
            ? { type: "service" as const, serviceId: target.service.id, unitPriceCents: target.service.priceCents ?? amountCents }
            : target.kind === "appointment"
              ? { type: "service" as const, serviceId: target.appointment.serviceId, unitPriceCents: target.appointment.priceCents ?? amountCents }
              : { type: "custom" as const, description: target.description.trim(), unitPriceCents: amountCents };
      if (item.type === "custom" && !item.description) {
        setSubmitting(false);
        return setError("Descreva o que foi pago.");
      }
      result = await registerSaleAction({
        appointmentId: target.kind === "appointment" ? target.appointment.id : null,
        customerId: customerId || null,
        saleDate: date,
        dueDate: todayDateStr(),
        discountCents: target.kind === "appointment" ? target.appointment.discountCents : 0,
        items: [item],
        payment: { amountCents, method, receiptTxid: txid },
      });
    }
    setSubmitting(false);
    if (!result.ok) return setError(result.error ?? "Erro ao registrar.");
    onCompleted();
  }

  const s = read?.suggestions;
  const otherSuggestions: Target[] = s
    ? [
        ...s.openSales.map((sale) => ({ kind: "openSale" as const, sale })),
        ...s.appointments.map((appointment) => ({ kind: "appointment" as const, appointment })),
        ...s.products.map((p) => ({ kind: "product" as const, ...p })),
        ...s.services.map((service) => ({ kind: "service" as const, service })),
      ].filter((t) => !suggestion || describe(t) !== describe(suggestion))
    : [];

  return (
    <Modal open={open} onClose={onClose} title="Registrar pelo comprovante" widthClassName="max-w-xl">
      {!read ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-brand-graphite/70">
            Mande a foto ou o PDF do comprovante (Pix, maquininha, transferência). O sistema lê o valor, quem pagou e a
            data — você só confere.
          </p>
          <ReceiptButton variant="primary" label="Escolher ou fotografar comprovante" onRead={handleRead} />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-brand-beige bg-brand-cream/40 p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-brand-graphite/50">Lido do comprovante</p>
            <p className="mt-1 text-brand-graphite">
              {read.data.payerName ? <strong>{read.data.payerName}</strong> : "Pagador não identificado"}
              {read.data.bank ? <span className="text-brand-graphite/60"> · {read.data.bank}</span> : null}
              {read.data.date ? <span className="text-brand-graphite/60"> · {formatShortDatePtBR(read.data.date)}</span> : null}
              {read.data.time ? <span className="text-brand-graphite/60"> {read.data.time}</span> : null}
            </p>
            {read.data.transactionId ? (
              <p className="mt-0.5 truncate text-xs text-brand-graphite/50">ID: {read.data.transactionId}</p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <FieldLabel htmlFor="r-amount">Valor</FieldLabel>
              <MoneyInput id="r-amount" value={amountCents} allowEmpty onChange={setAmountCents} />
            </div>
            <div>
              <FieldLabel htmlFor="r-date">Data</FieldLabel>
              <Input id="r-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="r-method">Forma</FieldLabel>
              <Select id="r-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {fin.methodChoices(method).map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <FieldLabel>Cliente</FieldLabel>
            {s && s.customers.length > 1 && !customerId ? (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {s.customers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCustomerId(c.id)}
                    className="rounded-full border border-brand-beige px-3 py-1.5 text-xs font-medium text-brand-graphite hover:border-brand-moss"
                  >
                    {c.fullName}?
                  </button>
                ))}
              </div>
            ) : null}
            <CustomerPicker customers={customers} value={customerId} onChange={setCustomerId} />
            {read.data.payerName && s?.customers.length === 0 ? (
              <p className="mt-1.5 text-xs text-brand-graphite/60">
                Nenhum cliente cadastrado com o nome “{read.data.payerName}”.
              </p>
            ) : null}
          </div>

          <div>
            <FieldLabel>O que foi pago?</FieldLabel>

            {target ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-moss/50 bg-brand-sage/15 px-4 py-3">
                <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-brand-graphite">
                  <Check size={16} className="shrink-0 text-brand-moss" />
                  <span className="min-w-0">{describe(target)}</span>
                </p>
                <button type="button" onClick={() => setTarget(null)} className="shrink-0 text-xs font-medium text-brand-moss hover:underline">
                  Trocar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestion && !choosing ? (
                  <div className="rounded-xl border border-brand-gold/50 bg-brand-gold/10 p-4">
                    <p className="text-sm text-brand-graphite/70">
                      Pelo valor{amountCents ? ` de ${formatBRL(amountCents)}` : ""}, parece ser:
                    </p>
                    <p className="mt-1 font-medium text-brand-graphite">{describe(suggestion)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" className="!px-4 !py-2 text-sm" onClick={() => pick(suggestion)}>
                        <Check size={15} /> Sim, foi isso
                      </Button>
                      <Button type="button" variant="secondary" className="!px-4 !py-2 text-sm" onClick={() => setChoosing("product")}>
                        <X size={15} /> Não, foi outro
                      </Button>
                    </div>
                  </div>
                ) : null}

                {choosing || !suggestion ? (
                  <div className="space-y-3">
                    {otherSuggestions.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {otherSuggestions.slice(0, 6).map((t) => (
                          <button
                            key={describe(t)}
                            type="button"
                            onClick={() => pick(t)}
                            className="rounded-full border border-brand-beige px-3 py-1.5 text-left text-xs font-medium text-brand-graphite hover:border-brand-moss"
                          >
                            {describe(t)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-brand-cream/60 p-1">
                      {(
                        [
                          ["product", "Produto", Package],
                          ["service", "Serviço", Scissors],
                          ["custom", "Outro", HandCoins],
                        ] as const
                      ).map(([value, label, Icon]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setChoosing(value)}
                          className={cn(
                            "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition",
                            choosing === value ? "bg-white text-brand-forest shadow-softer" : "text-brand-graphite/70"
                          )}
                        >
                          <Icon size={14} /> {label}
                        </button>
                      ))}
                    </div>
                    {choosing === "product" ? (
                      <ProductSearch
                        products={products}
                        stockLeft={(id) => products.find((p) => p.id === id)?.stockQuantity ?? 0}
                        onPick={(product) =>
                          pick({
                            kind: "product",
                            product,
                            // R$ 160 num produto de R$ 80 = 2 unidades
                            quantity:
                              amountCents && product.priceCents > 0 && amountCents % product.priceCents === 0
                                ? Math.max(1, amountCents / product.priceCents)
                                : 1,
                          })
                        }
                        onCancel={() => setChoosing(suggestion ? null : "product")}
                      />
                    ) : choosing === "service" ? (
                      <Select
                        defaultValue=""
                        onChange={(e) => {
                          const service = services.find((x) => x.id === e.target.value);
                          if (service) pick({ kind: "service", service });
                        }}
                      >
                        <option value="" disabled>
                          Escolha o serviço...
                        </option>
                        {services.map((sv) => (
                          <option key={sv.id} value={sv.id}>
                            {sv.name} {sv.priceCents != null ? `— ${formatBRL(sv.priceCents)}` : ""}
                          </option>
                        ))}
                      </Select>
                    ) : choosing === "custom" ? (
                      <div className="flex gap-2">
                        <Input value={customText} onChange={(e) => setCustomText(e.target.value)} placeholder="Ex.: sinal da coloração" />
                        <Button type="button" variant="secondary" onClick={() => pick({ kind: "custom", description: customText })} disabled={!customText.trim()}>
                          OK
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}

            {target && target.kind === "appointment" ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-brand-graphite/60">
                <CalendarCheck size={13} /> O atendimento será marcado como concluído.
              </p>
            ) : null}
            {target && target.kind === "appointment" && apptProducts.length > 0 ? (
              <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-semibold">Os produtos deste atendimento não entram nesta venda:</p>
                <p className="mt-1">
                  {apptProducts.map((p) => `${p.quantity > 1 ? `${p.quantity}× ` : ""}${p.name}`).join(", ")} (
                  {formatBRL(apptProducts.reduce((sum, p) => sum + p.priceCents * p.quantity, 0))}).
                </p>
                <p className="mt-1">
                  O estoque deles não é baixado. Para cobrar tudo junto, feche esta tela e use &quot;Finalizar e
                  receber&quot; no atendimento. Se registrar por aqui, lance os produtos depois em Vendas.
                </p>
              </div>
            ) : null}
            {target && amountCents != null && targetValue(target) != null && amountCents < (targetValue(target) ?? 0) ? (
              <p className="mt-2 text-xs text-brand-graphite/70">
                Pagamento parcial: faltam {formatBRL((targetValue(target) ?? 0) - amountCents)}, que ficam em Contas a receber.
              </p>
            ) : null}
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex flex-wrap justify-between gap-3">
            <Button type="button" variant="ghost" onClick={() => setRead(null)}>
              Outro comprovante
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!target || submitting}>
              {submitting ? "Registrando..." : "Registrar pagamento"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
