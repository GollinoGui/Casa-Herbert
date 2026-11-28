"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Package, Plus, ScanBarcode, Scissors, Search, Trash2, PenLine } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea, FieldLabel } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { BarcodeScanner } from "@/components/admin/BarcodeScanner";
import { CustomerPicker } from "@/components/admin/CustomerPicker";
import { ReceiptButton } from "@/components/admin/ReceiptButton";
import { registerSaleAction } from "@/lib/actions/admin/sales";
import { listActiveProductsAction } from "@/lib/actions/admin/products";
import { listActiveServicesAction } from "@/lib/actions/admin/services";
import { listCustomersAction } from "@/lib/actions/admin/customers";
import { getAppointmentProductsAction, listProfessionalsAction } from "@/lib/actions/admin/appointments";
import { useFinanceOptions } from "@/components/admin/FinanceOptionsProvider";
import { formatBRL } from "@/lib/utils/money";
import { todayDateStr } from "@/lib/utils/date-format";
import { cn } from "@/lib/utils/cn";
import type { AppointmentWithRelations, Customer, PaymentMethod, Product, Professional, Service } from "@/types";
import type { SaleLineInput } from "@/lib/data/sales";

export interface SaleLine {
  key: string;
  type: "service" | "product" | "custom";
  refId: string | null;
  description: string;
  unitPriceCents: number;
  quantity: number;
}

export interface SalePrefill {
  customerId?: string | null;
  lines?: SaleLine[];
  payment?: { amountCents: number | null; method: PaymentMethod; receiptTxid: string | null; date: string | null };
}

interface SaleModalProps {
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
  /** Finalizar atendimento (confirmado) ou lançar algo depois dele (concluído). */
  appointment?: AppointmentWithRelations | null;
  /** "pending" = o cliente levou e não pagou: a venda já começa como "fica em aberto". */
  mode?: "sale" | "pending";
  prefill?: SalePrefill | null;
}

type PaymentMode = "full" | "partial" | "open";

let lineSeq = 0;
const newKey = () => `l${++lineSeq}`;

export function SaleModal({ open, onClose, onCompleted, appointment, mode = "sale", prefill }: SaleModalProps) {
  const fin = useFinanceOptions();
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [discountCents, setDiscountCents] = useState(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("full");
  const [method, setMethod] = useState<PaymentMethod>(() => fin.pickMethod());
  const [partialCents, setPartialCents] = useState<number | null>(null);
  const [receiptTxid, setReceiptTxid] = useState<string | null>(null);
  const [receiptNote, setReceiptNote] = useState<string | null>(null);
  const [saleDate, setSaleDate] = useState(todayDateStr());
  const [dueDate, setDueDate] = useState(todayDateStr());
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState<"product" | "service" | "custom" | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isCheckout = !!appointment && appointment.status === "CONFIRMED";

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNotes("");
    setAdding(null);
    setReceiptNote(null);
    setSaleDate(prefill?.payment?.date ?? todayDateStr());
    setDueDate(todayDateStr());
    setCustomerId(appointment?.customerId ?? prefill?.customerId ?? "");
    setDiscountCents(isCheckout ? appointment!.discountCents : 0);
    setPaymentMode(mode === "pending" ? "open" : "full");
    setMethod(prefill?.payment?.method ?? fin.pickMethod());
    setReceiptTxid(prefill?.payment?.receiptTxid ?? null);
    setPartialCents(null);

    const initial: SaleLine[] = prefill?.lines ? [...prefill.lines] : [];
    if (isCheckout && appointment) {
      initial.unshift({
        key: newKey(),
        type: "service",
        refId: appointment.serviceId,
        description: appointment.service.name,
        unitPriceCents: appointment.priceCents ?? appointment.service.priceCents ?? 0,
        quantity: 1,
      });
    }
    setLines(initial);

    listActiveProductsAction().then(setProducts);
    listProfessionalsAction().then((pros) => {
      setProfessionals(pros);
      const fromAppointment = appointment?.professionalId;
      setProfessionalId(fromAppointment && pros.some((p) => p.id === fromAppointment) ? fromAppointment : pros[0]?.id ?? "");
    });
    listActiveServicesAction().then(setServices);
    if (!appointment) listCustomersAction().then(setCustomers);
    if (isCheckout && appointment) {
      getAppointmentProductsAction(appointment.id).then((items) =>
        setLines((prev) => [
          ...prev,
          ...items.map((p) => ({
            key: newKey(),
            type: "product" as const,
            refId: p.productId,
            description: p.name,
            unitPriceCents: p.priceCents,
            quantity: p.quantity,
          })),
        ])
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const subtotal = lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
  const total = Math.max(0, subtotal - discountCents);
  const paidNow = paymentMode === "full" ? total : paymentMode === "partial" ? partialCents ?? 0 : 0;

  function stockLeft(productId: string, exceptKey?: string) {
    const product = products.find((p) => p.id === productId);
    const used = lines.filter((l) => l.refId === productId && l.key !== exceptKey).reduce((s, l) => s + l.quantity, 0);
    return (product?.stockQuantity ?? 0) - used;
  }

  function addProduct(product: Product, quantity = 1) {
    setError(null);
    if (stockLeft(product.id) < quantity) {
      setError(`"${product.name}" está sem estoque suficiente (restam ${Math.max(0, stockLeft(product.id))}).`);
      return;
    }
    setLines((prev) => {
      const existing = prev.find((l) => l.type === "product" && l.refId === product.id);
      if (existing) return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + quantity } : l));
      return [
        ...prev,
        { key: newKey(), type: "product", refId: product.id, description: product.name, unitPriceCents: product.priceCents, quantity },
      ];
    });
    setAdding(null);
  }

  function addService(service: Service) {
    setLines((prev) => [
      ...prev,
      { key: newKey(), type: "service", refId: service.id, description: service.name, unitPriceCents: service.priceCents ?? 0, quantity: 1 },
    ]);
    setAdding(null);
  }

  function updateLine(key: string, changes: Partial<SaleLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...changes } : l)));
  }

  function changeQty(line: SaleLine, delta: number) {
    const quantity = line.quantity + delta;
    if (quantity < 1) return;
    if (line.type === "product" && line.refId && delta > 0 && stockLeft(line.refId, line.key) < quantity) {
      setError(`"${line.description}" não tem mais unidades em estoque.`);
      return;
    }
    setError(null);
    updateLine(line.key, { quantity });
  }

  function handleBarcode(code: string) {
    setScannerOpen(false);
    const product = products.find((p) => p.barcode === code);
    if (product) addProduct(product);
    else setError(`O código ${code} não está cadastrado em nenhum produto. Cadastre em Estoque e tente de novo.`);
  }

  async function handleSubmit() {
    setError(null);
    if (lines.length === 0) return setError("Adicione ao menos um item.");
    if (lines.some((l) => l.type === "custom" && !l.description.trim())) return setError("Descreva o item avulso.");
    if (discountCents > subtotal) return setError("O desconto é maior que o valor dos itens.");
    if (paymentMode === "partial" && (!partialCents || partialCents >= total)) {
      return setError("No pagamento parcial, o valor recebido deve ser menor que o total.");
    }
    if (paymentMode !== "full" && !customerId) {
      return setError("Para deixar valor em aberto, escolha o cliente — é dele que vai ser cobrado.");
    }

    const items: SaleLineInput[] = lines.map((l) =>
      l.type === "product"
        ? { type: "product", productId: l.refId!, quantity: l.quantity, unitPriceCents: l.unitPriceCents }
        : l.type === "service"
          ? { type: "service", serviceId: l.refId!, unitPriceCents: l.unitPriceCents, quantity: l.quantity }
          : { type: "custom", description: l.description.trim(), unitPriceCents: l.unitPriceCents, quantity: l.quantity }
    );

    setSubmitting(true);
    const result = await registerSaleAction({
      appointmentId: appointment?.id ?? null,
      customerId: customerId || null,
      saleDate,
      dueDate: paymentMode === "full" ? null : dueDate,
      discountCents,
      notes: notes || null,
      professionalId: professionalId || null,
      items,
      payment: paidNow > 0 ? { amountCents: paidNow, method, receiptTxid } : null,
    });
    setSubmitting(false);
    if (!result.ok) return setError(result.error);
    onCompleted();
  }

  const title = isCheckout ? "Finalizar atendimento" : mode === "pending" ? "Lançar pendência" : "Nova venda";

  return (
    <Modal open={open} onClose={onClose} title={title} widthClassName="max-w-2xl">
      <div className="space-y-5">
        {mode === "pending" ? (
          <p className="rounded-xl bg-brand-gold/15 p-3 text-sm text-brand-graphite/80">
            Use quando o cliente levou algo e não pagou. O produto sai do estoque agora e o valor fica em
            <strong> Contas a receber</strong> até ele pagar.
          </p>
        ) : null}

        <div>
          <FieldLabel>Cliente</FieldLabel>
          {appointment ? (
            <p className="rounded-xl border border-brand-beige bg-brand-cream/40 px-4 py-2.5 text-sm font-medium text-brand-graphite">
              {appointment.customer.fullName}
              <span className="font-normal text-brand-graphite/60"> · {appointment.service.name}</span>
            </p>
          ) : (
            <CustomerPicker customers={customers} value={customerId} onChange={setCustomerId} />
          )}
        </div>

        <div>
          <FieldLabel>Itens</FieldLabel>
          {lines.length === 0 ? (
            <p className="rounded-xl border border-dashed border-brand-beige px-4 py-4 text-center text-sm text-brand-graphite/50">
              Nenhum item. Adicione um produto, serviço ou item avulso.
            </p>
          ) : (
            <ul className="space-y-2">
              {lines.map((line) => (
                <li key={line.key} className="rounded-xl border border-brand-beige p-3">
                  <div className="flex items-start justify-between gap-2">
                    {line.type === "custom" ? (
                      <Input
                        className="!py-2"
                        value={line.description}
                        placeholder="Descrição do item"
                        onChange={(e) => updateLine(line.key, { description: e.target.value })}
                      />
                    ) : (
                      <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-brand-graphite">
                        {line.type === "product" ? (
                          <Package size={15} className="shrink-0 text-brand-moss" />
                        ) : (
                          <Scissors size={15} className="shrink-0 text-brand-moss" />
                        )}
                        <span className="truncate">{line.description}</span>
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                      className="-m-1 shrink-0 rounded-lg p-1.5 text-brand-graphite/50 hover:text-red-600"
                      aria-label={`Remover ${line.description}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <div className="flex items-center rounded-full border border-brand-beige">
                      <button type="button" onClick={() => changeQty(line, -1)} className="p-2 text-brand-graphite/70" aria-label="Diminuir">
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm tabular-nums">{line.quantity}</span>
                      <button type="button" onClick={() => changeQty(line, 1)} className="p-2 text-brand-graphite/70" aria-label="Aumentar">
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="w-36">
                      <MoneyInput
                        className="!py-2"
                        aria-label="Valor unitário"
                        value={line.unitPriceCents}
                        onChange={(v) => updateLine(line.key, { unitPriceCents: v ?? 0 })}
                      />
                    </div>
                    <span className="ml-auto text-sm font-semibold tabular-nums text-brand-graphite">
                      {formatBRL(line.unitPriceCents * line.quantity)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {adding === "product" ? (
            <ProductSearch
              products={products}
              stockLeft={stockLeft}
              onPick={(p) => addProduct(p)}
              onCancel={() => setAdding(null)}
            />
          ) : adding === "service" ? (
            <div className="mt-3 flex gap-2">
              <Select
                autoFocus
                defaultValue=""
                onChange={(e) => {
                  const s = services.find((x) => x.id === e.target.value);
                  if (s) addService(s);
                }}
              >
                <option value="" disabled>
                  Escolha o serviço...
                </option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.priceCents != null ? `— ${formatBRL(s.priceCents)}` : ""}
                  </option>
                ))}
              </Select>
              <Button type="button" variant="ghost" onClick={() => setAdding(null)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="!px-3 !py-2 text-xs" onClick={() => setAdding("product")}>
                <Package size={14} /> Produto
              </Button>
              <Button type="button" variant="secondary" className="!px-3 !py-2 text-xs" onClick={() => setScannerOpen(true)}>
                <ScanBarcode size={14} /> Ler código
              </Button>
              <Button type="button" variant="secondary" className="!px-3 !py-2 text-xs" onClick={() => setAdding("service")}>
                <Scissors size={14} /> Serviço
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="!px-3 !py-2 text-xs"
                onClick={() =>
                  setLines((prev) => [...prev, { key: newKey(), type: "custom", refId: null, description: "", unitPriceCents: 0, quantity: 1 }])
                }
              >
                <PenLine size={14} /> Item avulso
              </Button>
            </div>
          )}
        </div>

        {professionals.length > 1 ? (
          <div>
            <FieldLabel htmlFor="sale-professional">Quem vendeu</FieldLabel>
            <Select id="sale-professional" value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-brand-graphite/50">A comissão da venda vai para essa pessoa.</p>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="sale-discount">Desconto</FieldLabel>
            <MoneyInput id="sale-discount" value={discountCents} onChange={(v) => setDiscountCents(v ?? 0)} />
          </div>
          <div>
            <FieldLabel htmlFor="sale-date">Data da venda</FieldLabel>
            <Input id="sale-date" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
          </div>
        </div>

        <div className="rounded-xl bg-brand-cream/60 p-4">
          <div className="flex justify-between text-sm text-brand-graphite/70">
            <span>Itens</span>
            <span className="tabular-nums">{formatBRL(subtotal)}</span>
          </div>
          {discountCents > 0 ? (
            <div className="flex justify-between text-sm text-brand-graphite/70">
              <span>Desconto</span>
              <span className="tabular-nums">− {formatBRL(discountCents)}</span>
            </div>
          ) : null}
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-serif text-lg text-brand-forest">Total</span>
            <span className="font-serif text-2xl tabular-nums text-brand-forest">{formatBRL(total)}</span>
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className="mb-1.5 text-sm font-medium text-brand-graphite">Pagamento</legend>
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-brand-cream/60 p-1">
            {(
              [
                ["full", "Pago agora"],
                ["partial", "Pago em parte"],
                ["open", "Fica em aberto"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPaymentMode(value)}
                aria-pressed={paymentMode === value}
                className={cn(
                  "rounded-lg px-2 py-2 text-xs font-medium transition sm:text-sm",
                  paymentMode === value ? "bg-white text-brand-forest shadow-softer" : "text-brand-graphite/70"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {paymentMode !== "open" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="sale-method">Forma de pagamento</FieldLabel>
                <Select id="sale-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                  {fin.methodChoices(method).map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
              {paymentMode === "partial" ? (
                <div>
                  <FieldLabel htmlFor="sale-partial">Valor recebido</FieldLabel>
                  <MoneyInput id="sale-partial" value={partialCents} allowEmpty onChange={setPartialCents} />
                </div>
              ) : null}
            </div>
          ) : null}

          {paymentMode !== "full" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="sale-due">Cobrar até</FieldLabel>
                <Input id="sale-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <p className="self-end pb-3 text-sm text-brand-graphite/70">
                Fica a receber: <strong className="tabular-nums">{formatBRL(Math.max(0, total - paidNow))}</strong>
              </p>
            </div>
          ) : null}

          {paymentMode !== "open" ? (
            <ReceiptButton
              label="Ler comprovante (Pix, maquininha)"
              onRead={({ data }) => {
                setMethod(data.method === "dinheiro" ? "dinheiro" : data.method);
                setReceiptTxid(data.transactionId);
                if (data.date) setSaleDate(data.date);
                if (data.amountCents != null && data.amountCents < total) {
                  setPaymentMode("partial");
                  setPartialCents(data.amountCents);
                }
                setReceiptNote(
                  data.amountCents == null
                    ? "Comprovante lido, mas sem valor legível — confira."
                    : data.amountCents === total
                      ? `Comprovante de ${formatBRL(data.amountCents)} confere com o total.`
                      : data.amountCents < total
                        ? `Comprovante de ${formatBRL(data.amountCents)}: marquei como pago em parte.`
                        : `Atenção: o comprovante é de ${formatBRL(data.amountCents)}, maior que o total.`
                );
              }}
            />
          ) : null}
          {receiptNote ? <p className="text-sm text-brand-moss">{receiptNote}</p> : null}
        </fieldset>

        <div>
          <FieldLabel htmlFor="sale-notes">Observações (opcional)</FieldLabel>
          <Textarea id="sale-notes" rows={2} className="!min-h-0" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Salvando..." : isCheckout ? "Finalizar" : "Registrar"}
          </Button>
        </div>
      </div>

      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={handleBarcode} />
    </Modal>
  );
}

export function ProductSearch({
  products,
  stockLeft,
  onPick,
  onCancel,
}: {
  products: Product[];
  stockLeft: (id: string) => number;
  onPick: (p: Product) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => !q || p.name.toLowerCase().includes(q) || p.barcode === q).slice(0, 8);
  }, [products, query]);

  return (
    <div className="mt-3 rounded-xl border border-brand-beige p-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-graphite/40" />
          <Input autoFocus className="!py-2 pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar produto" />
        </div>
        <Button type="button" variant="ghost" className="!px-3" onClick={onCancel}>
          Fechar
        </Button>
      </div>
      <ul className="mt-2 max-h-52 overflow-y-auto overscroll-contain">
        {matches.length === 0 ? (
          <li className="px-3 py-2 text-sm text-brand-graphite/50">Nenhum produto encontrado.</li>
        ) : (
          matches.map((p) => {
            const left = stockLeft(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={left <= 0}
                  onClick={() => onPick(p)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-cream disabled:opacity-40"
                >
                  <span className="min-w-0 truncate font-medium text-brand-graphite">{p.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-brand-graphite/60">
                    {formatBRL(p.priceCents)} · {left > 0 ? `${left} em estoque` : "sem estoque"}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
