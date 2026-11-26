"use client";

import { EmptyState } from "@/components/admin/EmptyState";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Minus, Package, PenLine, Plus, ScanBarcode, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea, FieldLabel } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { FilterBar } from "@/components/admin/FilterBar";
import { BarcodeScanner } from "@/components/admin/BarcodeScanner";
import { ProductSearch } from "@/components/admin/SaleModal";
import { PayableStatusBadge, StatTile } from "@/components/admin/FinanceBadges";
import { registerPurchaseAction } from "@/lib/actions/admin/finance";
import { createProductAction, listAllProductsAction } from "@/lib/actions/admin/products";
import { useFinanceOptions } from "@/components/admin/FinanceOptionsProvider";
import { matchesText, matchesValue, parseListFilters } from "@/lib/utils/list-filters";
import { formatBRL } from "@/lib/utils/money";
import { formatShortDatePtBR, todayDateStr } from "@/lib/utils/date-format";
import type { PaymentMethod, Product, Purchase } from "@/types";

interface PurchasesManagerProps {
  purchases: Purchase[];
  products: Product[];
  defaults: { dateFrom: string; dateTo: string };
}

export function PurchasesManager({ purchases, products, defaults }: PurchasesManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const today = todayDateStr();

  const filters = useMemo(() => parseListFilters(searchParams, defaults), [searchParams, defaults]);
  const visible = useMemo(
    () =>
      purchases.filter(
        (p) =>
          matchesText(filters.customer, p.supplier, ...p.items.map((i) => i.description)) &&
          (!filters.productId || p.items.some((i) => i.productId === filters.productId)) &&
          matchesValue(p.totalCents, filters)
      ),
    [purchases, filters]
  );
  const total = visible.reduce((s, p) => s + p.totalCents, 0);
  const unpaid = visible.filter((p) => p.payable?.status === "open").reduce((s, p) => s + p.totalCents, 0);

  return (
    <div className="space-y-5">
      <Button onClick={() => setFormOpen(true)}>
        <Plus size={16} /> Nova compra
      </Button>

      <FilterBar
        fields={["date", "customer", "product", "value"]}
        customerPlaceholder="Fornecedor ou item"
        defaults={defaults}
        products={products.map((p) => ({ value: p.id, label: p.name }))}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Compras" value={String(visible.length)} />
        <StatTile label="Total comprado" value={formatBRL(total)} />
        <StatTile label="Ainda a pagar" value={formatBRL(unpaid)} tone={unpaid ? "warn" : undefined} />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-brand-beige bg-white">
          <EmptyState title="Nenhuma compra neste filtro" hint="Mude o período ou registre uma compra." />
        </div>
      ) : (
        <ul data-cascata className="space-y-2">
          {visible.map((p) => (
            <li key={p.id} className="rounded-2xl border border-brand-beige bg-white p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-brand-graphite">{p.supplier ?? "Fornecedor não informado"}</p>
                    {p.payable ? (
                      <PayableStatusBadge status={p.payable.status} overdue={p.payable.status === "open" && p.payable.dueDate < today} />
                    ) : null}
                  </div>
                  <p className="text-xs text-brand-graphite/60">
                    {formatShortDatePtBR(p.purchaseDate)}
                    {p.payable?.status === "open" ? ` · vence ${formatShortDatePtBR(p.payable.dueDate)}` : ""}
                  </p>
                  <ul className="mt-1.5 space-y-0.5 text-brand-graphite/80">
                    {p.items.map((i, idx) => (
                      <li key={idx}>
                        {i.quantity}× {i.description} <span className="text-brand-graphite/50">({formatBRL(i.unitCostCents)} cada)</span>
                      </li>
                    ))}
                  </ul>
                  {p.notes ? <p className="mt-1 text-xs text-brand-graphite/50">{p.notes}</p> : null}
                </div>
                <p className="text-base font-semibold tabular-nums text-brand-graphite">{formatBRL(p.totalCents)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PurchaseFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onDone={() => {
          setFormOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

interface Line {
  key: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitCostCents: number;
}

let seq = 0;

function PurchaseFormModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const fin = useFinanceOptions();
  const [products, setProducts] = useState<Product[]>([]);
  const [supplier, setSupplier] = useState("");
  const [date, setDate] = useState(todayDateStr());
  const [lines, setLines] = useState<Line[]>([]);
  const [paidNow, setPaidNow] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>(() => fin.pickMethod());
  const [dueDate, setDueDate] = useState(todayDateStr());
  const [notes, setNotes] = useState("");
  const [searching, setSearching] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [unknownCode, setUnknownCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSupplier("");
    setDate(todayDateStr());
    setLines([]);
    setPaidNow(true);
    setMethod(fin.pickMethod());
    setDueDate(todayDateStr());
    setNotes("");
    setSearching(false);
    setUnknownCode(null);
    setError(null);
    listAllProductsAction().then(setProducts);
  }, [open, fin]);

  function addProduct(product: Product) {
    setSearching(false);
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      return [
        ...prev,
        { key: `p${++seq}`, productId: product.id, description: product.name, quantity: 1, unitCostCents: product.costCents ?? 0 },
      ];
    });
  }

  function updateLine(key: string, changes: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...changes } : l)));
  }

  function handleBarcode(code: string) {
    setScannerOpen(false);
    const product = products.find((p) => p.barcode === code);
    if (product) addProduct(product);
    else setUnknownCode(code);
  }

  const total = lines.reduce((s, l) => s + l.quantity * l.unitCostCents, 0);

  async function handleSubmit() {
    setError(null);
    if (lines.length === 0) return setError("Adicione ao menos um item.");
    if (lines.some((l) => !l.productId && !l.description.trim())) return setError("Descreva os itens sem cadastro.");
    setBusy(true);
    const result = await registerPurchaseAction({
      supplier: supplier.trim() || null,
      purchaseDate: date,
      dueDate: paidNow ? null : dueDate,
      notes: notes.trim() || null,
      paidNow,
      method: paidNow ? method : null,
      items: lines.map((l) => ({
        productId: l.productId,
        description: l.productId ? null : l.description.trim(),
        quantity: l.quantity,
        unitCostCents: l.unitCostCents,
      })),
    });
    setBusy(false);
    if (!result.ok) return setError(result.error ?? "Erro ao registrar a compra.");
    onDone();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova compra" widthClassName="max-w-2xl">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="pu-supplier">Fornecedor</FieldLabel>
            <Input id="pu-supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Ex.: Distribuidora" />
          </div>
          <div>
            <FieldLabel htmlFor="pu-date">Data da compra</FieldLabel>
            <Input id="pu-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div>
          <FieldLabel>Itens</FieldLabel>
          {lines.length > 0 ? (
            <ul className="space-y-2">
              {lines.map((line) => (
                <li key={line.key} className="rounded-xl border border-brand-beige p-3">
                  <div className="flex items-start justify-between gap-2">
                    {line.productId ? (
                      <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-brand-graphite">
                        <Package size={15} className="shrink-0 text-brand-moss" />
                        <span className="truncate">{line.description}</span>
                      </p>
                    ) : (
                      <Input
                        className="!py-2"
                        value={line.description}
                        placeholder="Item sem cadastro (ex.: luvas)"
                        onChange={(e) => updateLine(line.key, { description: e.target.value })}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                      className="-m-1 shrink-0 rounded-lg p-1.5 text-brand-graphite/50 hover:text-red-600"
                      aria-label="Remover item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <div className="flex items-center rounded-full border border-brand-beige">
                      <button
                        type="button"
                        onClick={() => updateLine(line.key, { quantity: Math.max(1, line.quantity - 1) })}
                        className="p-2 text-brand-graphite/70"
                        aria-label="Diminuir"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        className="w-10 bg-transparent text-center text-sm tabular-nums outline-none"
                        inputMode="numeric"
                        value={line.quantity}
                        aria-label="Quantidade"
                        onChange={(e) => updateLine(line.key, { quantity: Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1) })}
                      />
                      <button type="button" onClick={() => updateLine(line.key, { quantity: line.quantity + 1 })} className="p-2 text-brand-graphite/70" aria-label="Aumentar">
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="w-36">
                      <MoneyInput className="!py-2" aria-label="Custo unitário" value={line.unitCostCents} onChange={(v) => updateLine(line.key, { unitCostCents: v ?? 0 })} />
                    </div>
                    <span className="text-xs text-brand-graphite/50">custo cada</span>
                    <span className="ml-auto text-sm font-semibold tabular-nums">{formatBRL(line.quantity * line.unitCostCents)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {unknownCode ? (
            <QuickProductForm
              barcode={unknownCode}
              onCancel={() => setUnknownCode(null)}
              onCreated={(product) => {
                setProducts((prev) => [...prev, product]);
                setUnknownCode(null);
                addProduct(product);
              }}
            />
          ) : searching ? (
            <ProductSearch products={products} stockLeft={() => 1} onPick={addProduct} onCancel={() => setSearching(false)} />
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="!px-3 !py-2 text-xs" onClick={() => setSearching(true)}>
                <Package size={14} /> Produto
              </Button>
              <Button type="button" variant="secondary" className="!px-3 !py-2 text-xs" onClick={() => setScannerOpen(true)}>
                <ScanBarcode size={14} /> Ler código
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="!px-3 !py-2 text-xs"
                onClick={() => setLines((prev) => [...prev, { key: `p${++seq}`, productId: null, description: "", quantity: 1, unitCostCents: 0 }])}
              >
                <PenLine size={14} /> Item sem cadastro
              </Button>
            </div>
          )}
          <p className="mt-2 text-xs text-brand-graphite/50">Produtos cadastrados entram no estoque na hora. Itens sem cadastro só viram despesa.</p>
        </div>

        <div className="flex items-baseline justify-between rounded-xl bg-brand-cream/60 p-4">
          <span className="font-serif text-lg text-brand-forest">Total</span>
          <span className="font-serif text-2xl tabular-nums text-brand-forest">{formatBRL(total)}</span>
        </div>

        <fieldset className="space-y-3">
          <legend className="mb-1.5 text-sm font-medium text-brand-graphite">Pagamento</legend>
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-brand-cream/60 p-1">
            {(
              [
                [true, "Já paguei"],
                [false, "Vou pagar depois"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => setPaidNow(value)}
                aria-pressed={paidNow === value}
                className={`rounded-lg px-2 py-2 text-sm font-medium transition ${paidNow === value ? "bg-white text-brand-forest shadow-softer" : "text-brand-graphite/70"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {paidNow ? (
            <Select aria-label="Forma de pagamento" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {fin.methodChoices(method).map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          ) : (
            <div>
              <FieldLabel htmlFor="pu-due">Vencimento</FieldLabel>
              <Input id="pu-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <p className="mt-1 text-xs text-brand-graphite/50">A compra vai para Contas a pagar.</p>
            </div>
          )}
        </fieldset>

        <div>
          <FieldLabel htmlFor="pu-notes">Observações (opcional)</FieldLabel>
          <Textarea id="pu-notes" rows={2} className="!min-h-0" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Nº da nota, prazo..." />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={busy}>
            {busy ? "Salvando..." : "Registrar compra"}
          </Button>
        </div>
      </div>
      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={handleBarcode} />
    </Modal>
  );
}

/** Código lido que ainda não é de nenhum produto: cadastra ali mesmo, sem sair da compra. */
function QuickProductForm({
  barcode,
  onCancel,
  onCreated,
}: {
  barcode: string;
  onCancel: () => void;
  onCreated: (product: Product) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (name.trim().length < 2) return setError("Informe o nome do produto.");
    setBusy(true);
    const result = await createProductAction({
      name: name.trim(),
      priceCents: price ?? 0,
      stockQuantity: 0,
      isActive: true,
      barcode,
    });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onCreated(result.product);
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-brand-gold/50 bg-brand-gold/10 p-4">
      <p className="text-sm text-brand-graphite">
        O código <strong>{barcode}</strong> não está cadastrado. Cadastre o produto agora:
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do produto" autoFocus />
        <MoneyInput value={price} allowEmpty onChange={setPrice} placeholder="Preço de venda" />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" className="!px-4 !py-2 text-sm" onClick={handleCreate} disabled={busy}>
          {busy ? "Salvando..." : "Cadastrar e adicionar"}
        </Button>
        <Button type="button" variant="ghost" className="!px-4 !py-2 text-sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
