"use client";

import { EmptyState } from "@/components/admin/EmptyState";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Globe, Pencil, Plus, ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ActiveBadge } from "@/components/ui/Badge";
import { Input, Textarea, FieldLabel } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { ImageField } from "@/components/admin/MediaPicker";
import { BarcodeScanner } from "@/components/admin/BarcodeScanner";
import { FilterBar } from "@/components/admin/FilterBar";
import { StatTile } from "@/components/admin/FinanceBadges";
import { createProductAction, updateProductAction, setProductActiveAction } from "@/lib/actions/admin/products";
import { matchesText, matchesValue, parseListFilters } from "@/lib/utils/list-filters";
import { formatBRL } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";
import type { ImagePosition, Product } from "@/types";
import type { StockForecast } from "@/lib/data/products";

/** Sem mínimo definido no produto, "estoque baixo" é até 3. Com mínimo, ele manda (e entra no aviso do Início). */
const LOW_STOCK_THRESHOLD = 3;
const lowLimit = (p: Product) => p.minStock ?? LOW_STOCK_THRESHOLD;
const NO_DATES = { dateFrom: "", dateTo: "" };

/** Abaixo disso a previsão aparece em destaque: dá tempo de pedir antes de acabar. */
const FORECAST_ALERT_DAYS = 14;

function forecastLabel(f: StockForecast | undefined, stock: number) {
  if (!f || f.daysLeft === null || stock === 0) return null;
  if (f.daysLeft < 1) return "acaba hoje no ritmo atual";
  if (f.daysLeft > 180) return null;
  return `acaba em ~${f.daysLeft} dia${f.daysLeft === 1 ? "" : "s"}`;
}

export function ProductsManager({ products, forecast = {} }: { products: Product[]; forecast?: Record<string, StockForecast> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [newBarcode, setNewBarcode] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const filters = useMemo(() => parseListFilters(searchParams, NO_DATES), [searchParams]);
  const visible = useMemo(
    () =>
      products.filter(
        (p) =>
          matchesText(filters.customer, p.name, p.barcode) &&
          matchesValue(p.priceCents, filters) &&
          (!filters.status ||
            (filters.status === "low" && p.isActive && p.stockQuantity > 0 && p.stockQuantity <= lowLimit(p)) ||
            (filters.status === "out" && p.isActive && p.stockQuantity === 0) ||
            (filters.status === "active" && p.isActive) ||
            (filters.status === "inactive" && !p.isActive))
      ),
    [products, filters]
  );

  const active = products.filter((p) => p.isActive);
  const stockValue = active.reduce((s, p) => s + (p.costCents ?? 0) * p.stockQuantity, 0);
  const low = active.filter((p) => p.stockQuantity <= lowLimit(p)).length;

  function handleScan(code: string) {
    setScannerOpen(false);
    const product = products.find((p) => p.barcode === code);
    if (product) {
      setNotice(null);
      setEditing(product);
    } else {
      setNotice(`Código ${code} ainda não cadastrado — preencha o novo produto.`);
      setNewBarcode(code);
      setEditing("new");
    }
  }

  async function handleToggleActive(product: Product) {
    await setProductActiveAction(product.id, !product.isActive);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            setNewBarcode(null);
            setNotice(null);
            setEditing("new");
          }}
        >
          <Plus size={16} /> Novo produto
        </Button>
        <Button variant="secondary" onClick={() => setScannerOpen(true)}>
          <ScanBarcode size={16} /> Ler código de barras
        </Button>
      </div>

      <FilterBar
        fields={["customer", "value", "status"]}
        defaults={NO_DATES}
        customerPlaceholder="Nome ou código de barras"
        statuses={[
          { value: "low", label: "Estoque baixo" },
          { value: "out", label: "Sem estoque" },
          { value: "active", label: "Ativos" },
          { value: "inactive", label: "Inativos" },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Produtos ativos" value={String(active.length)} />
        <StatTile label="Estoque baixo ou zerado" value={String(low)} tone={low ? "warn" : undefined} />
        <StatTile label="Valor em estoque (custo)" value={formatBRL(stockValue)} hint="só produtos com custo informado" />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-brand-beige bg-white">
          <EmptyState title="Nenhum produto encontrado" hint="Mude a busca ou cadastre um produto." />
        </div>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
          {visible.map((p) => {
            const isLow = p.isActive && p.stockQuantity <= lowLimit(p);
            return (
              <li key={p.id} className={cn("rounded-2xl border border-brand-beige bg-white p-4", !p.isActive && "opacity-60")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-brand-graphite">{p.name}</p>
                    <p className="mt-0.5 text-xs text-brand-graphite/60">
                      Venda {formatBRL(p.priceCents)}
                      {p.costCents != null ? ` · custo ${formatBRL(p.costCents)}` : ""}
                    </p>
                    {p.barcode ? <p className="text-xs tabular-nums text-brand-graphite/50">Código {p.barcode}</p> : null}
                    {p.showOnSite ? (
                      <span className="mt-1 flex w-fit items-center gap-1 text-xs text-brand-moss">
                        <Globe size={12} aria-hidden="true" /> No site
                      </span>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className={cn("text-2xl font-semibold tabular-nums", isLow ? "text-red-700" : "text-brand-graphite")}>
                      {p.stockQuantity}
                    </p>
                    <p className={cn("text-xs", isLow ? "font-medium text-red-700" : "text-brand-graphite/50")}>
                      {p.stockQuantity === 0 ? "sem estoque" : isLow ? "estoque baixo" : "em estoque"}
                    </p>
                    {p.isActive && forecastLabel(forecast[p.id], p.stockQuantity) ? (
                      <p
                        className={cn(
                          "mt-0.5 text-xs",
                          (forecast[p.id].daysLeft ?? Infinity) <= FORECAST_ALERT_DAYS ? "font-medium text-amber-800" : "text-brand-graphite/50"
                        )}
                        title={`Uso médio: ${forecast[p.id].dailyUse.toFixed(2).replace(".", ",")} por dia nos últimos 30 dias`}
                      >
                        {forecastLabel(forecast[p.id], p.stockQuantity)}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex gap-2 border-t border-brand-beige/70 pt-3">
                  <Button variant="secondary" className="flex-1 !px-3 !py-1.5 text-xs" onClick={() => setEditing(p)}>
                    <Pencil size={14} /> Editar
                  </Button>
                  <Button variant="ghost" className="flex-1 !px-3 !py-1.5 text-xs" onClick={() => handleToggleActive(p)}>
                    {p.isActive ? "Desativar" : "Reativar"}
                  </Button>
                  {!p.isActive ? <ActiveBadge active={false} /> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ProductFormModal
        product={editing}
        initialBarcode={newBarcode}
        notice={notice}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />
      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={handleScan} />
    </div>
  );
}

function ProductFormModal({
  product,
  initialBarcode,
  notice,
  onClose,
  onSaved,
}: {
  product: Product | "new" | null;
  initialBarcode: string | null;
  notice: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = product && product !== "new" ? product : null;
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | null>(null);
  const [cost, setCost] = useState<number | null>(null);
  const [stock, setStock] = useState("0");
  const [minStock, setMinStock] = useState("");
  const [barcode, setBarcode] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [siteOpen, setSiteOpen] = useState(false);
  const [showOnSite, setShowOnSite] = useState(false);
  const [description, setDescription] = useState("");
  const [imageId, setImageId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePosition, setImagePosition] = useState<ImagePosition | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!product) return;
    setName(editing?.name ?? "");
    setPrice(editing?.priceCents ?? null);
    setCost(editing?.costCents ?? null);
    setStock(String(editing?.stockQuantity ?? 0));
    setMinStock(editing?.minStock != null ? String(editing.minStock) : "");
    setBarcode(editing?.barcode ?? initialBarcode ?? "");
    setIsActive(editing?.isActive ?? true);
    setShowOnSite(editing?.showOnSite ?? false);
    setDescription(editing?.description ?? "");
    setImageId(editing?.imageId ?? null);
    setImageUrl(editing?.imageUrl ?? null);
    setImagePosition(editing?.imagePosition ?? null);
    setSiteOpen(false);
    setError(null);
  }, [product, editing, initialBarcode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("Informe o nome do produto.");
    if (price == null) return setError("Informe o preço de venda.");
    const stockQuantity = Number(stock);
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) return setError("Quantidade em estoque inválida.");
    const min = minStock.trim() === "" ? null : Number(minStock);
    if (min !== null && (!Number.isInteger(min) || min < 0)) return setError("Estoque mínimo inválido.");
    const input = {
      name: name.trim(),
      priceCents: price,
      costCents: cost,
      stockQuantity,
      minStock: min,
      barcode: barcode.trim() || null,
      isActive,
      showOnSite,
      description: description.trim(),
      imageId,
      imagePosition,
    };
    setBusy(true);
    const result = editing ? await updateProductAction(editing.id, input) : await createProductAction(input);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onSaved();
  }

  return (
    <Modal open={!!product} onClose={onClose} title={editing ? "Editar produto" : "Novo produto"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {notice && !editing ? <p className="rounded-xl bg-brand-gold/15 p-3 text-sm text-brand-graphite">{notice}</p> : null}
        <div>
          <FieldLabel htmlFor="p-name">Nome</FieldLabel>
          <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <FieldLabel htmlFor="p-barcode">Código de barras</FieldLabel>
          <div className="flex gap-2">
            <Input id="p-barcode" inputMode="numeric" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Opcional" />
            <Button type="button" variant="secondary" className="!px-3" onClick={() => setScannerOpen(true)} aria-label="Ler código de barras">
              <ScanBarcode size={18} />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <FieldLabel htmlFor="p-price">Preço de venda</FieldLabel>
            <MoneyInput id="p-price" value={price} allowEmpty onChange={setPrice} />
          </div>
          <div>
            <FieldLabel htmlFor="p-cost">Custo</FieldLabel>
            <MoneyInput id="p-cost" value={cost} allowEmpty onChange={setCost} placeholder="Opcional" />
          </div>
          <div>
            <FieldLabel htmlFor="p-stock">Em estoque</FieldLabel>
            <Input id="p-stock" type="number" min={0} inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>
          <div className="sm:col-span-3">
            <FieldLabel htmlFor="p-min">Avisar quando tiver</FieldLabel>
            <Input
              id="p-min"
              type="number"
              min={0}
              inputMode="numeric"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="Sem aviso"
            />
            <p className="mt-1 text-xs text-brand-graphite/50">Com essa quantidade ou menos, o produto aparece em “Estoque baixo” no Início.</p>
          </div>
        </div>
        <p className="-mt-2 text-xs text-brand-graphite/50">
          Para entrada de mercadoria use a tela Compras (soma no estoque e registra o gasto). Aqui é para corrigir a contagem.
        </p>
        <label className="flex items-center gap-2 text-sm text-brand-graphite">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-brand-beige" />
          Produto ativo (aparece nas vendas)
        </label>

        <div className="rounded-xl border border-brand-beige">
          <button
            type="button"
            onClick={() => setSiteOpen((v) => !v)}
            aria-expanded={siteOpen}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-brand-graphite"
          >
            <Globe size={15} className="text-brand-moss" /> Site (opcional, para quando o site estiver no ar)
            <ChevronDown size={16} className={cn("ml-auto transition-transform", siteOpen && "rotate-180")} />
          </button>
          {siteOpen ? (
            <div className="space-y-4 px-4 pb-4">
              <label className="flex items-center gap-2 text-sm text-brand-graphite">
                <input type="checkbox" checked={showOnSite} onChange={(e) => setShowOnSite(e.target.checked)} className="h-4 w-4 rounded border-brand-beige" />
                Mostrar este produto no site
              </label>
              <div>
                <FieldLabel htmlFor="p-desc">Descrição para o site</FieldLabel>
                <Textarea id="p-desc" rows={3} maxLength={400} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="max-w-xs">
                <FieldLabel>Foto</FieldLabel>
                <ImageField
                  label={name || "Produto"}
                  imageUrl={imageUrl}
                  mediaId={imageId}
                  position={imagePosition}
                  onChange={(media) => {
                    setImageUrl(media?.url ?? null);
                    setImageId(media?.id ?? null);
                    if (!media) setImagePosition(null);
                  }}
                  onPositionChange={setImagePosition}
                />
              </div>
            </div>
          ) : null}
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          setScannerOpen(false);
          setBarcode(code);
        }}
      />
    </Modal>
  );
}
