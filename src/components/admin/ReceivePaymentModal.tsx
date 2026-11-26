"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, FieldLabel } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { ReceiptButton } from "@/components/admin/ReceiptButton";
import { receiveSalePaymentAction } from "@/lib/actions/admin/sales";
import { useFinanceOptions } from "@/components/admin/FinanceOptionsProvider";
import { openAmount } from "@/lib/finance/charge";
import { formatBRL } from "@/lib/utils/money";
import { todayDateStr } from "@/lib/utils/date-format";
import type { PaymentMethod, Sale } from "@/types";

interface ReceivePaymentModalProps {
  sale: Sale | null;
  onClose: () => void;
  onCompleted: () => void;
}

export function ReceivePaymentModal({ sale, onClose, onCompleted }: ReceivePaymentModalProps) {
  const fin = useFinanceOptions();
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod>(() => fin.pickMethod());
  const [date, setDate] = useState(todayDateStr());
  const [txid, setTxid] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sale) return;
    setAmount(openAmount(sale));
    setMethod(fin.pickMethod());
    setDate(todayDateStr());
    setTxid(null);
    setNote(null);
    setError(null);
  }, [sale, fin]);

  async function handleSubmit() {
    if (!sale || !amount) return setError("Informe o valor recebido.");
    setSubmitting(true);
    setError(null);
    const result = await receiveSalePaymentAction({ saleId: sale.id, amountCents: amount, method, date, receiptTxid: txid });
    setSubmitting(false);
    if (!result.ok) return setError(result.error);
    onCompleted();
  }

  const remaining = sale ? openAmount(sale) : 0;

  return (
    <Modal open={!!sale} onClose={onClose} title="Receber pagamento">
      {sale ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-beige bg-brand-cream/40 p-4 text-sm">
            <p className="font-medium text-brand-graphite">{sale.customer?.fullName ?? "Venda sem cliente"}</p>
            <p className="text-brand-graphite/70">{sale.items.map((i) => i.description).join(", ")}</p>
            <p className="mt-2 text-brand-graphite/70">
              Falta receber <strong className="tabular-nums text-brand-graphite">{formatBRL(remaining)}</strong>
              {sale.paidCents > 0 ? ` (já pagou ${formatBRL(sale.paidCents)})` : ""}
            </p>
          </div>

          <ReceiptButton
            onRead={({ data }) => {
              if (data.amountCents) setAmount(Math.min(data.amountCents, remaining));
              setMethod(data.method);
              setTxid(data.transactionId);
              if (data.date) setDate(data.date);
              setNote(
                data.amountCents && data.amountCents > remaining
                  ? `O comprovante é de ${formatBRL(data.amountCents)}, mais do que falta. Lancei só ${formatBRL(remaining)}.`
                  : `Comprovante lido${data.payerName ? ` — ${data.payerName}` : ""}. Confira os campos.`
              );
            }}
          />
          {note ? <p className="text-sm text-brand-moss">{note}</p> : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <FieldLabel htmlFor="rp-amount">Valor</FieldLabel>
              <MoneyInput id="rp-amount" value={amount} allowEmpty onChange={setAmount} />
            </div>
            <div>
              <FieldLabel htmlFor="rp-method">Forma</FieldLabel>
              <Select id="rp-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {fin.methodChoices(method).map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="rp-date">Data</FieldLabel>
              <Input id="rp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          {amount != null && amount < remaining && amount > 0 ? (
            <p className="text-xs text-brand-graphite/60">Pagamento parcial: continuam em aberto {formatBRL(remaining - amount)}.</p>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Salvando..." : "Confirmar recebimento"}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
