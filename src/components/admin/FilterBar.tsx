"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, Loader2, Search, X } from "lucide-react";
import { Input, Select } from "@/components/ui/Field";
import { addDaysToDateStr, todayDateStr } from "@/lib/utils/date-format";
import { monthRange, parseListFilters } from "@/lib/utils/list-filters";
import { cn } from "@/lib/utils/cn";

type Field = "date" | "customer" | "product" | "service" | "value" | "status";

interface Option {
  value: string;
  label: string;
}

interface FilterBarProps {
  fields: Field[];
  /** Período quando a URL não traz nenhum. Vazio = sem limite de data. */
  defaults: { dateFrom: string; dateTo: string };
  dateLabel?: string;
  products?: Option[];
  services?: Option[];
  statuses?: Option[];
  customerPlaceholder?: string;
}

function previousMonth(today: string) {
  const firstThisMonth = `${today.slice(0, 7)}-01`;
  return monthRange(addDaysToDateStr(firstThisMonth, -1));
}

export function FilterBar({
  fields,
  defaults,
  dateLabel = "Período",
  products = [],
  services = [],
  statuses = [],
  customerPlaceholder = "Nome ou telefone",
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = useMemo(() => parseListFilters(searchParams, defaults), [searchParams, defaults]);

  // Campos digitados só vão para a URL depois de uma pausa (cada mudança refaz a consulta).
  const [customer, setCustomer] = useState(current.customer);
  const [min, setMin] = useState(searchParams.get("min") ?? "");
  const [max, setMax] = useState(searchParams.get("max") ?? "");

  function update(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  useEffect(() => {
    if (customer === current.customer && min === (searchParams.get("min") ?? "") && max === (searchParams.get("max") ?? "")) return;
    const t = setTimeout(() => update({ cliente: customer.trim(), min: min.trim(), max: max.trim() }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, min, max]);

  const today = todayDateStr();
  const presets = [
    { label: "Hoje", from: today, to: today },
    { label: "7 dias", from: addDaysToDateStr(today, -6), to: today },
    { label: "Este mês", from: monthRange(today).dateFrom, to: monthRange(today).dateTo },
    { label: "Mês passado", from: previousMonth(today).dateFrom, to: previousMonth(today).dateTo },
  ];

  const activeCount =
    (current.customer ? 1 : 0) +
    (current.productId ? 1 : 0) +
    (current.serviceId ? 1 : 0) +
    (current.minCents != null || current.maxCents != null ? 1 : 0) +
    (current.status ? 1 : 0) +
    (searchParams.has("de") ? 1 : 0);

  function clearAll() {
    setCustomer("");
    setMin("");
    setMax("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  return (
    <div className="rounded-2xl border border-brand-beige bg-white p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          className="flex items-center gap-2 text-sm font-medium text-brand-graphite"
        >
          <Filter size={16} /> Filtros{activeCount ? ` (${activeCount})` : ""}
        </button>
        {isPending ? <Loader2 size={16} className="animate-spin text-brand-moss" aria-label="Atualizando" /> : null}
      </div>

      <div className={cn("mt-3 space-y-3 md:mt-0 md:block", !mobileOpen && "hidden")}>
        {fields.includes("date") ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
              <label className="min-w-0">
                <span className="mb-1 block text-xs font-medium text-brand-graphite/60">{dateLabel}: de</span>
                <Input
                  type="date"
                  className="!py-2"
                  value={current.dateFrom}
                  onChange={(e) => update({ de: e.target.value, ate: current.dateTo })}
                />
              </label>
              <label className="min-w-0">
                <span className="mb-1 block text-xs font-medium text-brand-graphite/60">até</span>
                <Input
                  type="date"
                  className="!py-2"
                  value={current.dateTo}
                  onChange={(e) => update({ ate: e.target.value, de: current.dateFrom })}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => {
                const active = current.dateFrom === p.from && current.dateTo === p.to;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => update({ de: p.from, ate: p.to })}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      active
                        ? "border-brand-forest bg-brand-forest text-brand-ink"
                        : "border-brand-beige text-brand-graphite/70 hover:border-brand-moss"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => update({ de: "todos", ate: "" })}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  !current.dateFrom && !current.dateTo
                    ? "border-brand-forest bg-brand-forest text-brand-ink"
                    : "border-brand-beige text-brand-graphite/70 hover:border-brand-moss"
                )}
              >
                Tudo
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {fields.includes("customer") ? (
            <label className="col-span-2 min-w-0 sm:col-span-1">
              <span className="mb-1 block text-xs font-medium text-brand-graphite/60">Cliente</span>
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-graphite/40" />
                <Input
                  className="!py-2 pl-8"
                  value={customer}
                  placeholder={customerPlaceholder}
                  onChange={(e) => setCustomer(e.target.value)}
                />
              </div>
            </label>
          ) : null}
          {fields.includes("product") ? (
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-medium text-brand-graphite/60">Produto</span>
              <Select className="!py-2" value={current.productId} onChange={(e) => update({ produto: e.target.value })}>
                <option value="">Todos</option>
                {products.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          {fields.includes("service") ? (
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-medium text-brand-graphite/60">Serviço</span>
              <Select className="!py-2" value={current.serviceId} onChange={(e) => update({ servico: e.target.value })}>
                <option value="">Todos</option>
                {services.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          {fields.includes("status") ? (
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-medium text-brand-graphite/60">Situação</span>
              <Select className="!py-2" value={current.status} onChange={(e) => update({ status: e.target.value })}>
                <option value="">Todas</option>
                {statuses.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          {fields.includes("value") ? (
            <div className="col-span-2 grid min-w-0 grid-cols-2 gap-2 sm:col-span-1">
              <label className="min-w-0">
                <span className="mb-1 block text-xs font-medium text-brand-graphite/60">Valor de R$</span>
                <Input className="!py-2" inputMode="decimal" value={min} placeholder="0" onChange={(e) => setMin(e.target.value)} />
              </label>
              <label className="min-w-0">
                <span className="mb-1 block text-xs font-medium text-brand-graphite/60">até R$</span>
                <Input className="!py-2" inputMode="decimal" value={max} placeholder="—" onChange={(e) => setMax(e.target.value)} />
              </label>
            </div>
          ) : null}
        </div>

        {activeCount > 0 ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1 text-xs font-medium text-brand-moss hover:underline"
            >
              <X size={13} /> Limpar filtros
            </button>
            {isPending ? <Loader2 size={14} className="hidden animate-spin text-brand-moss md:block" aria-label="Atualizando" /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
