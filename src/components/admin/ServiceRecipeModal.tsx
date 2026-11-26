"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, FieldLabel } from "@/components/ui/Field";
import { saveServiceRecipeAction } from "@/lib/actions/admin/services";
import type { Product, Service, ServiceProduct } from "@/types";

interface Line {
  productId: string;
  quantity: string; // texto do campo: aceita "0,5"
}

function toText(n: number) {
  return String(n).replace(".", ",");
}

function parseQuantity(text: string) {
  const n = Number(text.trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

/** Quanto de cada produto o serviço gasta. O estoque baixa sozinho quando o atendimento é concluído. */
export function ServiceRecipeModal({
  service,
  recipe,
  products,
  onClose,
  onSaved,
}: {
  service: Service | null;
  recipe: ServiceProduct[];
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!service) return;
    setLines(recipe.map((r) => ({ productId: r.productId, quantity: toText(r.quantity) })));
    setError(null);
  }, [service, recipe]);

  const used = new Set(lines.map((l) => l.productId));
  const available = products.filter((p) => !used.has(p.id));

  function update(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  async function handleSave() {
    if (!service) return;
    const parsed = lines.map((l) => ({ productId: l.productId, quantity: parseQuantity(l.quantity) }));
    if (parsed.some((l) => !(l.quantity > 0))) {
      setError("Preencha a quantidade de cada produto (ex.: 1, 2 ou 0,5).");
      return;
    }
    setSaving(true);
    const result = await saveServiceRecipeAction(service.id, parsed);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved();
  }

  return (
    <Modal open={service !== null} onClose={onClose} title={service ? `Consumo: ${service.name}` : "Consumo"}>
      <p className="mb-4 text-sm text-brand-graphite/70">
        O que se gasta em cada atendimento. Quando o atendimento é concluído, o estoque baixa sozinho. Use fração para
        produto que rende mais de uma vez: <strong>0,5</strong> baixa uma unidade a cada 2 atendimentos.
      </p>

      {lines.length === 0 ? (
        <p className="rounded-xl border border-dashed border-brand-beige px-4 py-6 text-center text-sm text-brand-graphite/60">
          Este serviço ainda não gasta nenhum produto do estoque.
        </p>
      ) : (
        <ul className="space-y-2">
          {lines.map((line, i) => {
            const current = products.find((p) => p.id === line.productId);
            const fallbackName = recipe.find((r) => r.productId === line.productId)?.name;
            return (
              <li key={line.productId} className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <FieldLabel htmlFor={`recipe-product-${i}`} className="sr-only">
                    Produto
                  </FieldLabel>
                  <Select
                    id={`recipe-product-${i}`}
                    value={line.productId}
                    onChange={(e) => update(i, { productId: e.target.value })}
                  >
                    {current ? null : <option value={line.productId}>{fallbackName ?? "Produto"} (inativo)</option>}
                    {[...(current ? [current] : []), ...available].map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-24 shrink-0">
                  <FieldLabel htmlFor={`recipe-qty-${i}`} className="text-xs">
                    Por atendimento
                  </FieldLabel>
                  <Input
                    id={`recipe-qty-${i}`}
                    inputMode="decimal"
                    value={line.quantity}
                    onChange={(e) => update(i, { quantity: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-brand-graphite/60 hover:bg-brand-cream hover:text-red-700"
                  aria-label={`Tirar ${current?.name ?? fallbackName ?? "produto"}`}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {available.length ? (
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => setLines((prev) => [...prev, { productId: available[0].id, quantity: "1" }])}
        >
          <Plus size={16} /> Adicionar produto
        </Button>
      ) : products.length === 0 ? (
        <p className="mt-3 text-xs text-brand-graphite/60">Cadastre os produtos em Estoque para montar o consumo.</p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar consumo"}
        </Button>
      </div>
    </Modal>
  );
}
