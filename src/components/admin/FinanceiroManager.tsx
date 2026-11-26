"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, FieldLabel } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { FilterBar } from "@/components/admin/FilterBar";
import { StatTile } from "@/components/admin/FinanceBadges";
import { addCashAdjustmentAction, reverseCashAdjustmentAction } from "@/lib/actions/admin/finance";
import { useFinanceOptions } from "@/components/admin/FinanceOptionsProvider";
import { matchesText, matchesValue, parseListFilters } from "@/lib/utils/list-filters";
import { formatBRL } from "@/lib/utils/money";
import { formatShortDatePtBR, todayDateStr } from "@/lib/utils/date-format";
import { CountUp } from "@/components/admin/CountUp";
import { EmptyState } from "@/components/admin/EmptyState";
import { BotanicalBranch } from "@/components/admin/BotanicalBranch";
import { cn } from "@/lib/utils/cn";
import type { Statement } from "@/lib/data/financials";
import type { CashDirection } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  venda: "Venda",
  recebimento: "Recebimento",
  conta: "Conta paga",
  compra: "Compra",
  ajuste: "Ajuste",
  estorno: "Estorno",
};

interface FinanceiroManagerProps {
  balanceCents: number;
  statement: Statement;
  defaults: { dateFrom: string; dateTo: string };
}

export function FinanceiroManager({ balanceCents, statement, defaults }: FinanceiroManagerProps) {
  const fin = useFinanceOptions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(() => parseListFilters(searchParams, defaults), [searchParams, defaults]);
  const entries = useMemo(
    () =>
      statement.entries.filter(
        (e) =>
          matchesText(filters.customer, e.description, e.customerName) &&
          (!filters.status || e.direction === filters.status) &&
          matchesValue(e.amountCents, filters)
      ),
    [statement.entries, filters]
  );

  async function reverse(entryId: string) {
    if (!confirm("Estornar este ajuste? Um lançamento contrário será criado.")) return;
    setError(null);
    const result = await reverseCashAdjustmentAction(entryId);
    if (!result.ok) setError(result.error ?? "Erro ao estornar.");
    else router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-brand-pine via-brand-pineSoft to-brand-pine p-6 text-brand-onPine shadow-lift sm:p-8">
        <BotanicalBranch draw className="pointer-events-none absolute -right-6 -top-6 h-56 w-44 rotate-[18deg] text-brand-onPine/[0.12]" strokeWidth={1.1} />
        <p className="relative text-sm font-medium text-brand-onPine/75">Saldo atual em caixa</p>
        <p className={cn("valor-sensivel relative mt-1 font-serif text-4xl tabular-nums tracking-tight sm:text-6xl", balanceCents < 0 ? "text-red-300" : "text-brand-onPine")}>
          <CountUp value={balanceCents} format={(n) => formatBRL(Math.round(n))} />
        </p>
        <p className="relative mt-2 max-w-lg text-sm text-brand-onPine/70">
          Tudo o que entrou menos tudo o que saiu, desde o início. Passa de um mês para o outro sozinho.
        </p>
        <button
          type="button"
          className="relative mt-5 inline-flex items-center gap-2 rounded-full bg-brand-forest px-4 py-2 text-sm font-medium text-brand-ink shadow-soft transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98]"
          onClick={() => setAdjustOpen(true)}
        >
          <SlidersHorizontal size={15} /> Ajustar saldo
        </button>
      </div>

      <FilterBar
        fields={["date", "customer", "value", "status"]}
        customerPlaceholder="Descrição ou cliente"
        defaults={defaults}
        statuses={[
          { value: "in", label: "Só entradas" },
          { value: "out", label: "Só saídas" },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Saldo no início do período" value={formatBRL(statement.openingCents)} />
        <StatTile label="Entradas" value={`+ ${formatBRL(statement.inCents)}`} tone="in" />
        <StatTile label="Saídas" value={`− ${formatBRL(statement.outCents)}`} tone="out" />
        <StatTile label="Saldo no fim do período" value={formatBRL(statement.closingCents)} />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="rounded-2xl border border-brand-beige bg-white">
        <div className="flex items-center justify-between border-b border-brand-beige px-4 py-3">
          <h2 className="font-serif text-lg text-brand-forest">Extrato</h2>
          <span className="text-xs text-brand-graphite/50">{entries.length} lançamento(s)</span>
        </div>
        {entries.length === 0 ? (
          <EmptyState title="Nenhum lançamento neste filtro" hint="Mude o período ou o tipo de lançamento." />
        ) : (
          <ul data-cascata className="divide-y divide-brand-beige/70">
            {entries.map((e) => (
              <li key={e.id} className={cn("flex items-start gap-3 px-4 py-3 text-sm", e.reversed && "opacity-60")}>
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    e.direction === "in" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
                  )}
                  aria-label={e.direction === "in" ? "Entrada" : "Saída"}
                >
                  {e.direction === "in" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-brand-graphite", e.reversed && "line-through")}>{e.description}</p>
                  <p className="text-xs text-brand-graphite/60">
                    {formatShortDatePtBR(e.entryDate)} · {CATEGORY_LABELS[e.category] ?? e.category}
                    {e.customerName ? ` · ${e.customerName}` : ""}
                    {e.paymentMethod ? ` · ${fin.methodLabel(e.paymentMethod)}` : ""}
                    {e.reversed ? " · estornado" : ""}
                  </p>
                  {e.category === "ajuste" && !e.reversed ? (
                    <button type="button" onClick={() => reverse(e.id)} className="mt-1 flex items-center gap-1 text-xs font-medium text-brand-moss hover:underline">
                      <RotateCcw size={12} /> Estornar ajuste
                    </button>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn("font-semibold tabular-nums", e.direction === "in" ? "text-emerald-800" : "text-red-700")}>
                    {e.direction === "in" ? "+" : "−"} {formatBRL(e.amountCents)}
                  </p>
                  <p className="valor-sensivel text-xs tabular-nums text-brand-graphite/50">saldo {formatBRL(e.balanceCents)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AdjustmentModal
        open={adjustOpen}
        currentBalance={balanceCents}
        onClose={() => setAdjustOpen(false)}
        onDone={() => {
          setAdjustOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function AdjustmentModal({
  open,
  currentBalance,
  onClose,
  onDone,
}: {
  open: boolean;
  currentBalance: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"set" | CashDirection>("set");
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState(todayDateStr());
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode("set");
    setAmount(null);
    setDate(todayDateStr());
    setDescription("");
    setError(null);
  }, [open]);

  // "Definir saldo" lança só a diferença — o histórico continua batendo.
  const diff = mode === "set" && amount != null ? amount - currentBalance : null;

  async function handleSubmit() {
    if (amount == null) return setError("Informe o valor.");
    let direction: CashDirection;
    let value: number;
    let text: string;
    if (mode === "set") {
      if (diff === 0) return setError("O saldo já é esse valor.");
      direction = diff! > 0 ? "in" : "out";
      value = Math.abs(diff!);
      text = description.trim() || `Acerto de saldo para ${formatBRL(amount)}`;
    } else {
      direction = mode;
      value = amount;
      text = description.trim() || (mode === "in" ? "Entrada manual" : "Retirada manual");
    }
    setBusy(true);
    const result = await addCashAdjustmentAction({ date, direction, amountCents: value, description: text });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onDone();
  }

  return (
    <Modal open={open} onClose={onClose} title="Ajustar saldo">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-brand-cream/60 p-1">
          {(
            [
              ["set", "Definir saldo"],
              ["in", "Entrada"],
              ["out", "Retirada"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={cn(
                "rounded-lg px-2 py-2 text-sm font-medium transition",
                mode === value ? "bg-white text-brand-forest shadow-softer" : "text-brand-graphite/70"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-sm text-brand-graphite/70">
          {mode === "set"
            ? "Use para começar (saldo inicial) ou para acertar com o que está de verdade no caixa/banco. O sistema lança só a diferença."
            : mode === "in"
              ? "Dinheiro que entrou fora das vendas (ex.: você colocou dinheiro no caixa)."
              : "Dinheiro que saiu fora das contas (ex.: retirada para uso pessoal)."}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="adj-amount">{mode === "set" ? "Saldo correto" : "Valor"}</FieldLabel>
            <MoneyInput id="adj-amount" value={amount} allowEmpty onChange={setAmount} />
          </div>
          <div>
            <FieldLabel htmlFor="adj-date">Data</FieldLabel>
            <Input id="adj-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        {diff != null && diff !== 0 ? (
          <p className="text-sm text-brand-graphite/70">
            Saldo hoje: {formatBRL(currentBalance)} → será lançada uma {diff > 0 ? "entrada" : "saída"} de{" "}
            <strong>{formatBRL(Math.abs(diff))}</strong>.
          </p>
        ) : null}
        <div>
          <FieldLabel htmlFor="adj-desc">Descrição (opcional)</FieldLabel>
          <Input id="adj-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Saldo inicial do caixa" />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? "Salvando..." : "Lançar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
