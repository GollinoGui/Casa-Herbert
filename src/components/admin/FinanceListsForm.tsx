"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldError, Input } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/utils/cn";
import {
  deletePayableCategoryAction,
  savePayableCategoriesAction,
  savePaymentMethodsAction,
} from "@/lib/actions/admin/settings";
import type { PayableCategoryOption, PaymentMethodOption } from "@/lib/finance/options";

function useSaveState() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(task: () => Promise<{ ok: true } | { ok: false; error: string }>, after?: () => void) {
    setSaving(true);
    setError(null);
    const result = await task();
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setSaved(true);
    after?.();
    setTimeout(() => setSaved(false), 3000);
    return true;
  }
  return { saving, saved, error, run };
}

export function PaymentMethodsForm({ methods }: { methods: PaymentMethodOption[] }) {
  const router = useRouter();
  const [list, setList] = useState(methods);
  const state = useSaveState();
  const synced = JSON.stringify(methods);
  useEffect(() => {
    setList(methods);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synced]);
  const dirty = JSON.stringify(list) !== JSON.stringify(methods);

  function patch(i: number, change: Partial<PaymentMethodOption>) {
    setList((l) => l.map((m, j) => (j === i ? { ...m, ...change } : m)));
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-1 font-serif text-xl text-brand-forest">Formas de pagamento</h2>
      <p className="mb-5 text-sm text-brand-graphite/60">
        Desligue as que o salão não aceita — elas somem das telas de venda, recebimento, compra e pagamento de conta. Vendas
        antigas continuam mostrando o nome. Dá para trocar o nome (ex.: “Cartão de crédito” → “Crédito”).
      </p>
      <ul className="space-y-2">
        {list.map((m, i) => (
          <li
            key={m.value}
            className={cn(
              "grid items-center gap-2 rounded-xl border border-brand-beige p-2 sm:grid-cols-[1fr_auto]",
              !m.enabled && "bg-brand-cream/60"
            )}
          >
            <Input
              aria-label={`Nome da forma de pagamento (${methods[i].label})`}
              value={m.label}
              maxLength={30}
              onChange={(e) => patch(i, { label: e.target.value })}
            />
            <div className="sm:w-48">
              <Switch label={m.enabled ? "Aceita" : "Não aceita"} checked={m.enabled} onChange={(v) => patch(i, { enabled: v })} />
            </div>
          </li>
        ))}
      </ul>
      <FieldError>{state.error}</FieldError>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={() => state.run(() => savePaymentMethodsAction(list), () => router.refresh())} disabled={state.saving || !dirty}>
          {state.saving ? "Salvando..." : "Salvar formas de pagamento"}
        </Button>
        {state.saved ? (
          <span role="status" className="text-sm text-brand-moss">
            Formas de pagamento salvas.
          </span>
        ) : null}
      </div>
    </Card>
  );
}

type CategoryRow = PayableCategoryOption & { key: string };

export function PayableCategoriesForm({
  categories,
  usage,
}: {
  categories: PayableCategoryOption[];
  usage: Record<string, number>;
}) {
  const router = useRouter();
  const initial = categories.map((c) => ({ ...c, key: c.slug }));
  const [list, setList] = useState<CategoryRow[]>(initial);
  const [newLabel, setNewLabel] = useState("");
  const state = useSaveState();
  // Recarregado depois de salvar: categorias novas ganham o slug criado no servidor.
  const synced = JSON.stringify(categories);
  useEffect(() => {
    setList(categories.map((c) => ({ ...c, key: c.slug })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synced]);
  const strip = (rows: CategoryRow[]) => rows.map(({ slug, label, active }) => ({ slug, label, active }));
  const dirty = JSON.stringify(strip(list)) !== JSON.stringify(strip(initial));

  function patch(key: string, change: Partial<CategoryRow>) {
    setList((l) => l.map((c) => (c.key === key ? { ...c, ...change } : c)));
  }

  function move(index: number, delta: -1 | 1) {
    setList((l) => {
      const target = index + delta;
      if (target < 0 || target >= l.length) return l;
      const next = [...l];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function add() {
    const label = newLabel.trim();
    if (!label) return;
    setList((l) => [...l, { slug: "", label, active: true, key: `novo-${Date.now()}` }]);
    setNewLabel("");
  }

  async function remove(row: CategoryRow) {
    if (!row.slug) {
      setList((l) => l.filter((c) => c.key !== row.key));
      return;
    }
    if (dirty) {
      window.alert("Salve as mudanças nas categorias antes de apagar uma.");
      return;
    }
    if (!window.confirm(`Apagar a categoria “${row.label}”?`)) return;
    await state.run(() => deletePayableCategoryAction(row.slug), () => {
      setList((l) => l.filter((c) => c.key !== row.key));
      router.refresh();
    });
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-1 font-serif text-xl text-brand-forest">Categorias de contas a pagar</h2>
      <p className="mb-5 text-sm text-brand-graphite/60">
        As opções de “Categoria” em Contas a pagar e Contas fixas. Use as setas para mudar a ordem. Categoria já usada em alguma
        conta não pode ser apagada — desative, e as contas antigas continuam com o nome.
      </p>

      <ul className="space-y-2">
        {list.map((c, i) => {
          const used = usage[c.slug] ?? 0;
          return (
            <li
              key={c.key}
              className={cn(
                "grid items-center gap-2 rounded-xl border border-brand-beige p-2 sm:grid-cols-[auto_1fr_auto_auto]",
                !c.active && "bg-brand-cream/60"
              )}
            >
              <div className="flex gap-1">
                <IconButton label={`Subir ${c.label}`} onClick={() => move(i, -1)} disabled={i === 0}>
                  <ArrowUp size={16} />
                </IconButton>
                <IconButton label={`Descer ${c.label}`} onClick={() => move(i, 1)} disabled={i === list.length - 1}>
                  <ArrowDown size={16} />
                </IconButton>
              </div>
              <div className="min-w-0">
                <Input aria-label="Nome da categoria" value={c.label} maxLength={60} onChange={(e) => patch(c.key, { label: e.target.value })} />
                <p className="mt-1 px-1 text-xs text-brand-graphite/50">
                  {!c.slug ? "Nova — salve para usar" : used ? `Usada em ${used} conta(s)` : "Ainda não usada"}
                </p>
              </div>
              <div className="sm:w-40">
                <Switch label={c.active ? "Ativa" : "Desativada"} checked={c.active} onChange={(v) => patch(c.key, { active: v })} />
              </div>
              <IconButton
                label={used ? `${c.label} está em uso e não pode ser apagada` : `Apagar ${c.label}`}
                onClick={() => remove(c)}
                disabled={used > 0 || state.saving}
              >
                <Trash2 size={16} />
              </IconButton>
            </li>
          );
        })}
      </ul>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <Input
          aria-label="Nome da nova categoria"
          placeholder="Nova categoria (ex.: Marketing)"
          value={newLabel}
          maxLength={60}
          onChange={(e) => setNewLabel(e.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={!newLabel.trim()}>
          <Plus size={16} /> Adicionar
        </Button>
      </form>

      <FieldError>{state.error}</FieldError>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          onClick={() => state.run(() => savePayableCategoriesAction(strip(list)), () => router.refresh())}
          disabled={state.saving || !dirty}
        >
          {state.saving ? "Salvando..." : "Salvar categorias"}
        </Button>
        {state.saved ? (
          <span role="status" className="text-sm text-brand-moss">
            Categorias salvas.
          </span>
        ) : dirty ? (
          <span className="text-sm text-brand-graphite/60">Há mudanças não salvas.</span>
        ) : null}
      </div>
    </Card>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-brand-graphite/70 transition-colors hover:bg-brand-cream hover:text-brand-graphite disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}
