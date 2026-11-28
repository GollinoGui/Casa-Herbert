"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Store, Undo2, UserRound } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, FieldLabel } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { FilterBar } from "@/components/admin/FilterBar";
import { EmptyState } from "@/components/admin/EmptyState";
import { useFinanceOptions } from "@/components/admin/FinanceOptionsProvider";
import { payCommissionAction, undoCommissionPaymentAction } from "@/lib/actions/admin/commissions";
import type { CommissionTarget } from "@/lib/data/commissions";
import { formatBRL } from "@/lib/utils/money";
import { formatShortDatePtBR, todayDateStr } from "@/lib/utils/date-format";
import { cn } from "@/lib/utils/cn";
import type { PaymentMethod } from "@/types";

const percent = (bps: number) => `${(bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

export function CommissionsOverview({
  targets,
  defaults,
}: {
  targets: CommissionTarget[];
  defaults: { dateFrom: string; dateTo: string };
}) {
  const [paying, setPaying] = useState<CommissionTarget | null>(null);
  const professionals = targets.filter((t) => t.kind === "professional");
  const brands = targets.filter((t) => t.kind === "brand");

  return (
    <div className="space-y-6">
      <FilterBar fields={["date"]} defaults={defaults} />

      <section className="space-y-3">
        <h2 className="font-serif text-lg text-brand-forest">Profissionais</h2>
        {professionals.length ? (
          <div data-cascata className="grid gap-3 lg:grid-cols-2">
            {professionals.map((t) => (
              <TargetCard key={t.id} target={t} onPay={() => setPaying(t)} />
            ))}
          </div>
        ) : (
          <EmptyState compact title="Nenhum profissional" hint="Cadastre em Percentuais e marcas." />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg text-brand-forest">Marcas consignadas</h2>
        {brands.length ? (
          <div data-cascata className="grid gap-3 lg:grid-cols-2">
            {brands.map((t) => (
              <TargetCard key={t.id} target={t} onPay={() => setPaying(t)} />
            ))}
          </div>
        ) : (
          <EmptyState
            compact
            title="Nenhuma marca consignada"
            hint="Cadastre a marca em Percentuais e marcas e escolha a marca no cadastro do produto."
          />
        )}
      </section>

      <PayModal target={paying} onClose={() => setPaying(null)} />
    </div>
  );
}

function TargetCard({ target: t, onPay }: { target: CommissionTarget; onPay: () => void }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fin = useFinanceOptions();
  const isBrand = t.kind === "brand";
  const Icon = isBrand ? Store : UserRound;

  function undo(entryId: string) {
    if (!confirm("Desfazer este pagamento? O valor volta para o saldo e para o devido.")) return;
    startTransition(async () => {
      const result = await undoCommissionPaymentAction(entryId);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-cream text-brand-forest">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-brand-graphite">
              {t.name}
              {!t.isActive ? <span className="ml-2 text-xs font-normal text-brand-graphite/50">(inativo)</span> : null}
            </p>
            <p className="text-xs text-brand-graphite/60">
              {isBrand ? `Fica ${percent(t.brandCommissionBps ?? 0)} com o salão` : "Comissão sobre o que já entrou"}
            </p>
          </div>
        </div>
        <Button variant="primary" className="shrink-0 px-4 py-2" onClick={onPay} disabled={t.owedCents <= 0}>
          {isBrand ? "Repassar" : "Pagar"}
        </Button>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl bg-brand-cream/50 p-2.5">
          <dt className="text-xs text-brand-graphite/60">{isBrand ? "Repasse no período" : "Ganho no período"}</dt>
          <dd className="tabular-nums font-medium text-brand-graphite">{formatBRL(t.earnedPeriodCents)}</dd>
        </div>
        <div className="rounded-xl bg-brand-cream/50 p-2.5">
          <dt className="text-xs text-brand-graphite/60">{isBrand ? "Ficou no salão" : "Pago no período"}</dt>
          <dd className="tabular-nums font-medium text-brand-graphite">
            {formatBRL(isBrand ? t.earnedBasePeriodCents - t.earnedPeriodCents : t.paidPeriodCents)}
          </dd>
        </div>
        <div className={cn("rounded-xl p-2.5", t.owedCents > 0 ? "bg-brand-forest/15" : "bg-brand-cream/50")}>
          <dt className="text-xs text-brand-graphite/60">Devido hoje</dt>
          <dd className="tabular-nums font-semibold text-brand-graphite">{formatBRL(t.owedCents)}</dd>
        </div>
      </dl>
      {t.owedCents < 0 ? (
        <p className="mt-2 text-xs text-brand-graphite/70">
          Pago a mais (venda cancelada depois do pagamento): {formatBRL(-t.owedCents)} será descontado no próximo.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}

      {t.lines.length || t.payments.length ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-3 flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-sm text-brand-forest hover:bg-brand-forest/5"
        >
          <span>
            {t.lines.length} {t.lines.length === 1 ? "lançamento" : "lançamentos"}
            {t.payments.length ? ` · ${t.payments.length} ${t.payments.length === 1 ? "pagamento" : "pagamentos"}` : ""}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      ) : null}

      {open ? (
        <div className="mt-2 space-y-3 text-sm">
          {t.lines.length ? (
            <ul className="divide-y divide-brand-beige">
              {t.lines.map((l) => (
                <li key={l.key} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-brand-graphite">{l.description}</p>
                    <p className="text-xs text-brand-graphite/60">
                      {formatShortDatePtBR(l.date)} · vendido {formatBRL(l.baseCents)}
                      {l.pending ? ` · aguardando pagamento (total ${formatBRL(l.fullCents)})` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums text-brand-graphite">{formatBRL(l.earnedCents)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {t.payments.length ? (
            <ul className="divide-y divide-brand-beige rounded-xl bg-brand-cream/40 px-3">
              {t.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className={cn("truncate", p.reversed ? "text-brand-graphite/50 line-through" : "text-brand-graphite")}>
                      {p.description}
                    </p>
                    <p className="text-xs text-brand-graphite/60">
                      {formatShortDatePtBR(p.date)}
                      {p.method ? ` · ${fin.methodLabel(p.method)}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums">{p.isReversal ? "+" : "−"} {formatBRL(p.amountCents)}</span>
                    {!p.isReversal && !p.reversed ? (
                      <button
                        type="button"
                        onClick={() => undo(p.id)}
                        disabled={pending}
                        className="rounded-lg p-1.5 text-brand-graphite/60 hover:bg-brand-forest/10 hover:text-brand-graphite"
                        aria-label="Desfazer pagamento"
                        title="Desfazer pagamento"
                      >
                        <Undo2 className="h-4 w-4" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function PayModal({ target, onClose }: { target: CommissionTarget | null; onClose: () => void }) {
  const fin = useFinanceOptions();
  const router = useRouter();
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod>(() => fin.pickMethod("pix"));
  const [date, setDate] = useState(todayDateStr());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [openedFor, setOpenedFor] = useState<string | null>(null);

  if (target && openedFor !== target.id) {
    setOpenedFor(target.id);
    setAmount(target.owedCents);
    setDate(todayDateStr());
    setNotes("");
    setError(null);
  }
  if (!target && openedFor) setOpenedFor(null);

  async function submit() {
    if (!target || !amount) return setError("Informe o valor.");
    setSubmitting(true);
    const result = await payCommissionAction({ kind: target.kind, refId: target.id, amountCents: amount, method, date, notes });
    setSubmitting(false);
    if (!result.ok) return setError(result.error);
    onClose();
    router.refresh();
  }

  const isBrand = target?.kind === "brand";
  return (
    <Modal open={!!target} onClose={onClose} title={isBrand ? `Repasse para ${target?.name}` : `Comissão de ${target?.name}`}>
      <div className="space-y-4">
        <p className="rounded-xl bg-brand-cream/60 p-3 text-sm text-brand-graphite/80">
          Devido hoje: <strong className="tabular-nums">{formatBRL(target?.owedCents ?? 0)}</strong>. O pagamento sai do saldo
          como {isBrand ? "repasse de marca" : "comissão"}.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="commission-amount">Valor</FieldLabel>
            <MoneyInput id="commission-amount" value={amount} onChange={setAmount} />
          </div>
          <div>
            <FieldLabel htmlFor="commission-method">Forma de pagamento</FieldLabel>
            <Select id="commission-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {fin.methodChoices(method).map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="commission-date">Data</FieldLabel>
            <Input id="commission-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="commission-notes">Observação (opcional)</FieldLabel>
            <Input id="commission-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: novembro" />
          </div>
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Registrando..." : "Registrar pagamento"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
