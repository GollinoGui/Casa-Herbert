"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Textarea } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { EmptyState } from "@/components/admin/EmptyState";
import { closeCashDrawerAction } from "@/lib/actions/admin/cash-closings";
import { formatBRL } from "@/lib/utils/money";
import { formatShortDatePtBR } from "@/lib/utils/date-format";
import { cn } from "@/lib/utils/cn";
import type { CashClosing, CashDrawerPreview } from "@/types";

const TIME = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const DATE_TIME = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function signed(cents: number) {
  return cents === 0 ? formatBRL(0) : `${cents > 0 ? "+" : "−"} ${formatBRL(Math.abs(cents))}`;
}

/**
 * Conferência da gaveta (só dinheiro em espécie). O esperado parte do que foi
 * contado no último fechamento, menos o que foi para o banco, mais as entradas e
 * saídas em dinheiro lançadas depois dele (close_cash_drawer, 0017).
 */
export function CashClosingPanel({ preview, closings }: { preview: CashDrawerPreview; closings: CashClosing[] }) {
  const router = useRouter();
  const [openingCents, setOpeningCents] = useState<number | null>(preview.firstClosing ? null : preview.openingCents);
  const [countedCents, setCountedCents] = useState<number | null>(null);
  const [withdrawnCents, setWithdrawnCents] = useState<number | null>(null);
  const [postDifference, setPostDifference] = useState(true);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  const opening = preview.firstClosing ? openingCents ?? 0 : preview.openingCents;
  const expected = opening + preview.cashInCents - preview.cashOutCents;
  const difference = countedCents == null ? null : countedCents - expected;

  async function handleClose() {
    if (countedCents == null) return setError("Conte a gaveta e informe o valor.");
    if ((withdrawnCents ?? 0) > countedCents) return setError("A retirada não pode passar do que foi contado.");
    setSaving(true);
    setError(null);
    const result = await closeCashDrawerAction({
      countedCents,
      withdrawnCents: withdrawnCents ?? 0,
      openingCents: preview.firstClosing ? opening : undefined,
      postDifference,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    if (!result.ok) return setError(result.error);
    setDone(result.differenceCents);
    setCountedCents(null);
    setWithdrawnCents(null);
    setNotes("");
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="p-5 sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 font-serif text-xl text-brand-forest">
          <Banknote size={20} strokeWidth={1.75} className="text-brand-moss" aria-hidden="true" /> Fechar o caixa
        </h2>
        <p className="mb-5 text-sm text-brand-graphite/60">
          {preview.firstClosing
            ? "Primeiro fechamento: informe o troco que havia na gaveta no começo do dia."
            : `Desde o último fechamento (${DATE_TIME.format(new Date(preview.previousAt!))}).`}
        </p>

        <dl className="space-y-2 rounded-xl bg-brand-cream/50 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-brand-graphite/70">{preview.firstClosing ? "Troco no início do dia" : "Ficou na gaveta"}</dt>
            <dd className="valor-sensivel tabular-nums">
              {preview.firstClosing ? (
                <MoneyInput id="cc-opening" className="!w-36 !py-1.5 text-right" value={openingCents} allowEmpty onChange={setOpeningCents} />
              ) : (
                formatBRL(opening)
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-brand-graphite/70">Entrou em dinheiro</dt>
            <dd className="valor-sensivel tabular-nums text-brand-moss">+ {formatBRL(preview.cashInCents)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-brand-graphite/70">Saiu em dinheiro</dt>
            <dd className="valor-sensivel tabular-nums">− {formatBRL(preview.cashOutCents)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-t border-brand-beige pt-2">
            <dt className="font-medium text-brand-graphite">Deveria ter</dt>
            <dd className="valor-sensivel font-serif text-xl tabular-nums text-brand-forest">{formatBRL(expected)}</dd>
          </div>
        </dl>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="cc-counted">Contei na gaveta</FieldLabel>
            <MoneyInput id="cc-counted" value={countedCents} allowEmpty placeholder="R$ 0,00" onChange={setCountedCents} />
          </div>
          <div>
            <FieldLabel htmlFor="cc-withdrawn">Levei para o banco (opcional)</FieldLabel>
            <MoneyInput id="cc-withdrawn" value={withdrawnCents} allowEmpty placeholder="R$ 0,00" onChange={setWithdrawnCents} />
            <p className="mt-1 text-xs text-brand-graphite/50">Não muda o saldo: o dinheiro só troca de lugar.</p>
          </div>
        </div>

        {difference != null ? (
          <p
            role="status"
            className={cn(
              "mt-4 rounded-xl px-4 py-3 text-sm",
              difference === 0 ? "bg-brand-sage/15 text-brand-moss" : "border border-amber-200 bg-amber-50 text-amber-900"
            )}
          >
            {difference === 0
              ? "Bateu certinho."
              : difference > 0
                ? `Sobrou ${formatBRL(difference)} em relação ao esperado.`
                : `Faltou ${formatBRL(-difference)} em relação ao esperado.`}
          </p>
        ) : null}

        {difference ? (
          <label className="mt-3 flex items-start gap-2 text-sm text-brand-graphite">
            <input
              type="checkbox"
              checked={postDifference}
              onChange={(e) => setPostDifference(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-brand-beige"
            />
            <span>
              Lançar a diferença no saldo como ajuste
              <span className="block text-xs text-brand-graphite/50">
                Desmarque se ainda vai procurar o motivo (um recebimento esquecido, por exemplo).
              </span>
            </span>
          </label>
        ) : null}

        <div className="mt-4">
          <FieldLabel htmlFor="cc-notes">Observação (opcional)</FieldLabel>
          <Textarea id="cc-notes" rows={2} className="!min-h-0" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {done !== null ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-brand-moss">
            <CheckCircle2 size={16} aria-hidden="true" /> Caixa fechado{done ? ` com diferença de ${signed(done)}` : ""}.
          </p>
        ) : null}

        <div className="mt-4">
          <Button onClick={handleClose} disabled={saving || countedCents == null}>
            {saving ? "Fechando..." : "Fechar o caixa"}
          </Button>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 font-serif text-xl text-brand-forest">Fechamentos anteriores</h2>
        {closings.length === 0 ? (
          <EmptyState compact title="Nenhum fechamento ainda" hint="Feche o caixa no fim do dia para conferir o dinheiro da gaveta." />
        ) : (
          <ul className="divide-y divide-brand-beige">
            {closings.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-brand-graphite">
                    {formatShortDatePtBR(c.closingDate)} · {TIME.format(new Date(c.createdAt))}
                  </p>
                  <p className="valor-sensivel text-xs text-brand-graphite/60">
                    Esperado {formatBRL(c.expectedCents)} · contado {formatBRL(c.countedCents)}
                    {c.withdrawnCents ? ` · ${formatBRL(c.withdrawnCents)} para o banco` : ""}
                  </p>
                  {c.notes ? <p className="text-xs italic text-brand-graphite/60">{c.notes}</p> : null}
                </div>
                <span
                  className={cn(
                    "valor-sensivel shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                    c.differenceCents === 0 ? "bg-brand-sage/20 text-brand-moss" : "bg-amber-100 text-amber-900"
                  )}
                  title={c.differenceCents && !c.posted ? "Diferença não lançada no saldo" : undefined}
                >
                  {c.differenceCents === 0 ? "Bateu" : signed(c.differenceCents)}
                  {c.differenceCents && !c.posted ? " *" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
        {closings.some((c) => c.differenceCents && !c.posted) ? (
          <p className="mt-3 text-xs text-brand-graphite/50">* diferença que não foi lançada no saldo.</p>
        ) : null}
      </Card>
    </div>
  );
}
