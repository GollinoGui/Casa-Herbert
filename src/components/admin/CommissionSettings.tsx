"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, FieldLabel } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { saveBrandAction, saveCommissionRuleAction, saveProfessionalAction } from "@/lib/actions/admin/commissions";
import type { Brand, CommissionRule, CommissionScope, Professional } from "@/types";

type Named = { id: string; name: string };

/** "10" ou "10,5" → bps; vazio → null. */
function parsePercent(text: string): number | null | "invalid" {
  const t = text.trim().replace("%", "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 100) return "invalid";
  return Math.round(n * 100);
}
const showPercent = (bps: number | null | undefined) =>
  bps == null ? "" : (bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export function CommissionSettings({
  professionals,
  brands,
  rules,
  services,
  products,
}: {
  professionals: Professional[];
  brands: Brand[];
  rules: CommissionRule[];
  services: Named[];
  products: Named[];
}) {
  return (
    <div className="space-y-6">
      <RulesSection professionals={professionals} brands={brands} rules={rules} services={services} products={products} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfessionalsSection professionals={professionals} />
        <BrandsSection brands={brands} />
      </div>
    </div>
  );
}

function useSaver() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    startTransition(async () => {
      setError(null);
      const result = await fn();
      if (!result.ok) return setError(result.error ?? "Não foi possível salvar.");
      after?.();
      router.refresh();
    });
  return { pending, error, setError, run };
}

// ---------------------------------------------------------------------------

function RulesSection({
  professionals,
  brands,
  rules,
  services,
  products,
}: {
  professionals: Professional[];
  brands: Brand[];
  rules: CommissionRule[];
  services: Named[];
  products: Named[];
}) {
  const [who, setWho] = useState<string>("");
  const [query, setQuery] = useState("");
  const { error, run } = useSaver();
  const professionalId = who || null;

  const rate = (pid: string | null, scope: CommissionScope, refId: string | null) =>
    rules.find((r) => r.professionalId === pid && r.scope === scope && r.refId === refId)?.rateBps ?? null;

  function save(scope: CommissionScope, refId: string | null, text: string) {
    const bps = parsePercent(text);
    if (bps === "invalid") return;
    if (bps === rate(professionalId, scope, refId)) return;
    run(() => saveCommissionRuleAction({ professionalId, scope, refId, rateBps: bps }));
  }

  const q = query.trim().toLocaleLowerCase("pt-BR");
  const match = (n: Named) => !q || n.name.toLocaleLowerCase("pt-BR").includes(q);
  const groups: { title: string; scope: CommissionScope; items: Named[] }[] = [
    { title: "Por marca", scope: "brand", items: brands.filter((b) => b.isActive).filter(match) },
    { title: "Por serviço", scope: "service", items: services.filter(match) },
    { title: "Por produto", scope: "product", items: products.filter(match) },
  ];

  const row = (key: string, label: string, scope: CommissionScope, refId: string | null, hint?: string) => {
    const own = rate(professionalId, scope, refId);
    const general = professionalId ? rate(null, scope, refId) : null;
    return (
      <PercentRow
        key={`${who}:${key}`}
        label={label}
        hint={hint}
        value={own}
        placeholder={general != null ? `${showPercent(general)} (todos)` : "—"}
        onSave={(text) => save(scope, refId, text)}
      />
    );
  };

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-lg text-brand-forest">Percentuais de comissão</h2>
          <p className="text-sm text-brand-graphite/60">Deixe vazio para usar a regra de cima. Salva ao sair do campo.</p>
        </div>
        <div className="sm:w-64">
          <FieldLabel htmlFor="rules-who">Vale para</FieldLabel>
          <Select id="rules-who" value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">Todos os profissionais</option>
            {professionals
              .filter((p) => p.isActive)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </Select>
        </div>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="divide-y divide-brand-beige rounded-xl border border-brand-beige">
        {row("sd", "Padrão para serviços", "service_default", null, "Vale para todo serviço sem regra própria")}
        {row("pd", "Padrão para produtos", "product_default", null, "Vale para todo produto sem regra própria")}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-graphite/40" aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar marca, serviço ou produto"
          className="pl-9"
          aria-label="Buscar marca, serviço ou produto"
        />
      </div>

      {groups.map((g) =>
        g.items.length ? (
          <div key={g.scope}>
            <h3 className="mb-2 text-sm font-medium text-brand-graphite/70">{g.title}</h3>
            <div className="divide-y divide-brand-beige rounded-xl border border-brand-beige">
              {g.items.map((item) => row(`${g.scope}:${item.id}`, item.name, g.scope, item.id))}
            </div>
          </div>
        ) : null
      )}
    </Card>
  );
}

function PercentRow({
  label,
  hint,
  value,
  placeholder,
  onSave,
}: {
  label: string;
  hint?: string;
  value: number | null;
  placeholder: string;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(showPercent(value));
  const invalid = parsePercent(text) === "invalid";
  return (
    <label className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="min-w-0">
        <span className="block truncate text-sm text-brand-graphite">{label}</span>
        {hint ? <span className="block text-xs text-brand-graphite/50">{hint}</span> : null}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <Input
          inputMode="decimal"
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => onSave(text)}
          aria-invalid={invalid || undefined}
          className="w-28 text-right tabular-nums"
        />
        <span className="text-sm text-brand-graphite/60">%</span>
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------

function ProfessionalsSection({ professionals }: { professionals: Professional[] }) {
  const [name, setName] = useState("");
  const { pending, error, run } = useSaver();

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <h2 className="font-serif text-lg text-brand-forest">Profissionais</h2>
      <ul className="space-y-2">
        {professionals.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-xl border border-brand-beige px-3 py-2">
            <Input
              defaultValue={p.name}
              aria-label="Nome do profissional"
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value.trim() !== p.name) {
                  run(() => saveProfessionalAction({ id: p.id, name: e.target.value, isActive: p.isActive }));
                }
              }}
            />
            <div className="shrink-0">
              <Switch
                checked={p.isActive}
                label={p.isActive ? "Ativo" : "Inativo"}
                disabled={pending}
                onChange={(isActive) => run(() => saveProfessionalAction({ id: p.id, name: p.name, isActive }))}
              />
            </div>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveProfessionalAction({ name, isActive: true }), () => setName(""));
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da nova profissional" aria-label="Nome" />
        <Button type="submit" variant="secondary" className="shrink-0" disabled={pending || !name.trim()}>
          <Plus className="h-4 w-4" aria-hidden /> Adicionar
        </Button>
      </form>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </Card>
  );
}

function BrandsSection({ brands }: { brands: Brand[] }) {
  const [name, setName] = useState("");
  const { pending, error, run } = useSaver();

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="font-serif text-lg text-brand-forest">Marcas</h2>
        <p className="text-sm text-brand-graphite/60">
          Consignada: o produto é da marca. <strong>Fica no salão</strong> é a comissão do Herbert; o resto é repassado.
        </p>
      </div>
      <ul className="space-y-2">
        {brands.map((b) => (
          <BrandRow key={b.id} brand={b} pending={pending} onSave={(next) => run(() => saveBrandAction({ ...b, ...next }))} />
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => saveBrandAction({ name, isConsigned: true, commissionBps: 0, isActive: true }),
            () => setName("")
          );
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da marca" aria-label="Nome da marca" />
        <Button type="submit" variant="secondary" className="shrink-0" disabled={pending || !name.trim()}>
          <Plus className="h-4 w-4" aria-hidden /> Adicionar
        </Button>
      </form>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </Card>
  );
}

function BrandRow({ brand: b, pending, onSave }: { brand: Brand; pending: boolean; onSave: (next: Partial<Brand>) => void }) {
  const [pct, setPct] = useState(showPercent(b.commissionBps));
  return (
    <li className="space-y-2 rounded-xl border border-brand-beige px-3 py-2">
      <div className="flex items-center gap-3">
        <Input
          defaultValue={b.name}
          aria-label="Nome da marca"
          onBlur={(e) => {
            if (e.target.value.trim() && e.target.value.trim() !== b.name) onSave({ name: e.target.value });
          }}
        />
        {b.isConsigned ? (
          <label className="flex shrink-0 items-center gap-1.5 text-sm text-brand-graphite/70">
            Fica no salão
            <Input
              inputMode="decimal"
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              onBlur={() => {
                const bps = parsePercent(pct);
                if (bps !== "invalid" && (bps ?? 0) !== b.commissionBps) onSave({ commissionBps: bps ?? 0 });
              }}
              className="w-20 text-right tabular-nums"
            />
            %
          </label>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <Switch checked={b.isConsigned} label="Consignada" disabled={pending} onChange={(isConsigned) => onSave({ isConsigned })} />
        <Switch checked={b.isActive} label="Ativa" disabled={pending} onChange={(isActive) => onSave({ isActive })} />
      </div>
    </li>
  );
}
