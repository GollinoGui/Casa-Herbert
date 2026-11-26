"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Pencil, Plus, Repeat, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea, FieldLabel } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { FilterBar } from "@/components/admin/FilterBar";
import { SwipeRow } from "@/components/admin/SwipeRow";
import { EmptyState } from "@/components/admin/EmptyState";
import { PayableStatusBadge, StatTile } from "@/components/admin/FinanceBadges";
import {
  cancelPayableAction,
  payPayableAction,
  savePayableAction,
  saveRecurringBillAction,
  undoPayablePaymentAction,
} from "@/lib/actions/admin/finance";
import { useFinanceOptions } from "@/components/admin/FinanceOptionsProvider";
import { matchesText, matchesValue, parseListFilters } from "@/lib/utils/list-filters";
import { formatBRL } from "@/lib/utils/money";
import { formatShortDatePtBR, todayDateStr } from "@/lib/utils/date-format";
import { cn } from "@/lib/utils/cn";
import type { Payable, PaymentMethod, RecurringBill } from "@/types";

interface PayablesManagerProps {
  payables: Payable[];
  recurringBills: RecurringBill[];
  defaults: { dateFrom: string; dateTo: string };
}

export function PayablesManager({ payables, recurringBills, defaults }: PayablesManagerProps) {
  const fin = useFinanceOptions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"contas" | "fixas">("contas");
  const [paying, setPaying] = useState<Payable | null>(null);
  const [editing, setEditing] = useState<Payable | "new" | null>(null);
  const [editingBill, setEditingBill] = useState<RecurringBill | "new" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const today = todayDateStr();

  const filters = useMemo(() => parseListFilters(searchParams, defaults), [searchParams, defaults]);
  const visible = useMemo(
    () =>
      payables.filter(
        (p) =>
          matchesText(filters.customer, p.description, p.supplier, fin.categoryLabel(p.category)) &&
          (!filters.status || p.status === filters.status || (filters.status === "overdue" && p.status === "open" && p.dueDate < today)) &&
          matchesValue(p.amountCents, filters)
      ),
    [payables, filters, today, fin]
  );

  const open = visible.filter((p) => p.status === "open");
  const paid = visible.filter((p) => p.status === "paid");
  const overdue = open.filter((p) => p.dueDate < today);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setActionError(null);
    const result = await action();
    if (!result.ok) setActionError(result.error ?? "Erro.");
    else router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="grid w-full grid-cols-2 gap-1.5 rounded-xl bg-white p-1 sm:w-96">
        {(
          [
            ["contas", "Contas"],
            ["fixas", "Contas fixas"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            aria-pressed={tab === value}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition",
              tab === value ? "bg-brand-forest text-brand-ink" : "text-brand-graphite/70 hover:bg-brand-cream"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "contas" ? (
        <>
          <Button onClick={() => setEditing("new")}>
            <Plus size={16} /> Nova conta
          </Button>
          <FilterBar
            fields={["date", "customer", "value", "status"]}
            dateLabel="Vencimento"
            customerPlaceholder="Descrição ou fornecedor"
            defaults={defaults}
            statuses={[
              { value: "open", label: "A pagar" },
              { value: "overdue", label: "Atrasadas" },
              { value: "paid", label: "Pagas" },
              { value: "cancelled", label: "Canceladas" },
            ]}
          />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatTile label="A pagar" value={formatBRL(open.reduce((s, p) => s + p.amountCents, 0))} hint={`${open.length} conta(s)`} tone="warn" />
            <StatTile
              label="Atrasadas"
              value={formatBRL(overdue.reduce((s, p) => s + p.amountCents, 0))}
              hint={`${overdue.length} conta(s)`}
              tone={overdue.length ? "out" : undefined}
            />
            <StatTile label="Pagas no período" value={formatBRL(paid.reduce((s, p) => s + p.amountCents, 0))} />
          </div>
          {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-brand-beige bg-white">
              <EmptyState title="Nenhuma conta neste filtro" hint="Mude o período ou a situação, ou cadastre uma nova conta." />
            </div>
          ) : (
            <ul data-cascata className="space-y-2">
              {visible.map((p) => (
                <li key={p.id}>
                  <SwipeRow
                    right={p.status === "open" ? { label: "Pagar", icon: CheckCircle2, tone: "leaf", onTrigger: () => setPaying(p) } : undefined}
                    left={p.status === "open" ? { label: "Editar", icon: Pencil, onTrigger: () => setEditing(p) } : undefined}
                  >
                  <div className={cn("cartao-vivo rounded-2xl border border-brand-beige bg-white p-4 text-sm", p.status === "cancelled" && "opacity-60")}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-brand-graphite">{p.description}</p>
                        <PayableStatusBadge status={p.status} overdue={p.status === "open" && p.dueDate < today} />
                        {p.recurringBillId ? <Repeat size={13} className="text-brand-moss" aria-label="Conta fixa" /> : null}
                      </div>
                      <p className="mt-0.5 text-xs text-brand-graphite/60">
                        {fin.categoryLabel(p.category)}
                        {p.supplier ? ` · ${p.supplier}` : ""} · vence {formatShortDatePtBR(p.dueDate)}
                        {p.paidOn ? ` · paga em ${formatShortDatePtBR(p.paidOn)}` : ""}
                        {p.paymentMethod ? ` (${fin.methodLabel(p.paymentMethod)})` : ""}
                      </p>
                      {p.notes ? <p className="mt-1 text-xs text-brand-graphite/50">{p.notes}</p> : null}
                    </div>
                    <p className="text-base font-semibold tabular-nums text-brand-graphite">{formatBRL(p.amountCents)}</p>
                  </div>
                  {p.status !== "cancelled" ? (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-brand-beige/70 pt-3">
                      {p.status === "open" ? (
                        <>
                          <Button className="!px-3 !py-1.5 text-xs" onClick={() => setPaying(p)}>
                            <CheckCircle2 size={14} /> Pagar
                          </Button>
                          <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => setEditing(p)}>
                            <Pencil size={14} /> Editar
                          </Button>
                          <Button
                            variant="ghost"
                            className="!px-3 !py-1.5 text-xs"
                            onClick={() => {
                              if (confirm(`Cancelar a conta "${p.description}"?`)) void run(() => cancelPayableAction(p.id));
                            }}
                          >
                            <XCircle size={14} /> Cancelar
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          className="!px-3 !py-1.5 text-xs"
                          onClick={() => {
                            if (confirm("Desfazer o pagamento? O valor volta para o saldo e a conta fica em aberto.")) {
                              void run(() => undoPayablePaymentAction(p.id));
                            }
                          }}
                        >
                          <RotateCcw size={14} /> Desfazer pagamento
                        </Button>
                      )}
                    </div>
                  ) : null}
                  </div>
                  </SwipeRow>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <Button onClick={() => setEditingBill("new")}>
            <Plus size={16} /> Nova conta fixa
          </Button>
          <p className="text-sm text-brand-graphite/70">
            Toda conta fixa ativa vira uma conta a pagar no mês, com o vencimento no dia escolhido. O valor é uma estimativa:
            na hora de pagar você ajusta para o valor da fatura.
          </p>
          {recurringBills.length === 0 ? (
            <div className="rounded-2xl border border-brand-beige bg-white">
              <EmptyState title="Nenhuma conta fixa" hint="Cadastre água, luz, aluguel, internet..." />
            </div>
          ) : (
            <ul className="space-y-2">
              {recurringBills.map((b) => (
                <li
                  key={b.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-beige bg-white p-4 text-sm",
                    !b.isActive && "opacity-60"
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-brand-graphite">
                      {b.description} {!b.isActive ? <span className="text-xs font-normal">(pausada)</span> : null}
                    </p>
                    <p className="text-xs text-brand-graphite/60">
                      {fin.categoryLabel(b.category)}
                      {b.supplier ? ` · ${b.supplier}` : ""} · todo dia {b.dueDay}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium tabular-nums text-brand-graphite">~ {formatBRL(b.amountCents)}</span>
                    <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => setEditingBill(b)}>
                      <Pencil size={14} /> Editar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <PayModal
        payable={paying}
        onClose={() => setPaying(null)}
        onDone={() => {
          setPaying(null);
          router.refresh();
        }}
      />
      <PayableFormModal
        payable={editing}
        onClose={() => setEditing(null)}
        onDone={() => {
          setEditing(null);
          router.refresh();
        }}
      />
      <RecurringBillModal
        bill={editingBill}
        onClose={() => setEditingBill(null)}
        onDone={() => {
          setEditingBill(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function PayModal({ payable, onClose, onDone }: { payable: Payable | null; onClose: () => void; onDone: () => void }) {
  const fin = useFinanceOptions();
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod>(() => fin.pickMethod());
  const [date, setDate] = useState(todayDateStr());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!payable) return;
    setAmount(payable.amountCents);
    setMethod(fin.pickMethod());
    setDate(todayDateStr());
    setError(null);
  }, [payable, fin]);

  async function handleSubmit() {
    if (!payable || !amount) return setError("Informe o valor pago.");
    setBusy(true);
    const result = await payPayableAction({ id: payable.id, amountCents: amount, method, date });
    setBusy(false);
    if (!result.ok) return setError(result.error ?? "Erro ao pagar.");
    onDone();
  }

  return (
    <Modal open={!!payable} onClose={onClose} title="Pagar conta">
      {payable ? (
        <div className="space-y-4">
          <p className="text-sm text-brand-graphite/80">
            <strong>{payable.description}</strong> · vence {formatShortDatePtBR(payable.dueDate)}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <FieldLabel htmlFor="pay-amount">Valor pago</FieldLabel>
              <MoneyInput id="pay-amount" value={amount} allowEmpty onChange={setAmount} />
            </div>
            <div>
              <FieldLabel htmlFor="pay-method">Forma</FieldLabel>
              <Select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {fin.methodChoices(method).map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="pay-date">Pago em</FieldLabel>
              <Input id="pay-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-brand-graphite/60">O valor sai do saldo na data do pagamento.</p>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              Voltar
            </Button>
            <Button onClick={handleSubmit} disabled={busy}>
              {busy ? "Salvando..." : "Confirmar pagamento"}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function PayableFormModal({ payable, onClose, onDone }: { payable: Payable | "new" | null; onClose: () => void; onDone: () => void }) {
  const fin = useFinanceOptions();
  const editing = payable && payable !== "new" ? payable : null;
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(() => fin.pickCategory("outros"));
  const [supplier, setSupplier] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState(todayDateStr());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!payable) return;
    setDescription(editing?.description ?? "");
    setCategory(editing?.category ?? fin.pickCategory("outros"));
    setSupplier(editing?.supplier ?? "");
    setAmount(editing?.amountCents ?? null);
    setDueDate(editing?.dueDate ?? todayDateStr());
    setNotes(editing?.notes ?? "");
    setError(null);
  }, [payable, editing, fin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amount == null) return setError("Informe o valor.");
    setBusy(true);
    const result = await savePayableAction(editing?.id ?? null, {
      description,
      category,
      supplier: supplier || null,
      amountCents: amount,
      dueDate,
      notes: notes || null,
    });
    setBusy(false);
    if (!result.ok) return setError(result.error ?? "Erro ao salvar.");
    onDone();
  }

  return (
    <Modal open={!!payable} onClose={onClose} title={editing ? "Editar conta" : "Nova conta a pagar"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="pf-desc">Descrição</FieldLabel>
          <Input id="pf-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Conta de luz de novembro" required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="pf-cat">Categoria</FieldLabel>
            <Select id="pf-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              {fin.categoryChoices(category).map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="pf-sup">Fornecedor (opcional)</FieldLabel>
            <Input id="pf-sup" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="pf-amount">Valor</FieldLabel>
            <MoneyInput id="pf-amount" value={amount} allowEmpty onChange={setAmount} />
          </div>
          <div>
            <FieldLabel htmlFor="pf-due">Vencimento</FieldLabel>
            <Input id="pf-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="pf-notes">Observações (opcional)</FieldLabel>
          <Textarea id="pf-notes" rows={2} className="!min-h-0" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RecurringBillModal({ bill, onClose, onDone }: { bill: RecurringBill | "new" | null; onClose: () => void; onDone: () => void }) {
  const fin = useFinanceOptions();
  const editing = bill && bill !== "new" ? bill : null;
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(() => fin.pickCategory("energia"));
  const [supplier, setSupplier] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [dueDay, setDueDay] = useState("10");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!bill) return;
    setDescription(editing?.description ?? "");
    setCategory(editing?.category ?? fin.pickCategory("energia"));
    setSupplier(editing?.supplier ?? "");
    setAmount(editing?.amountCents ?? null);
    setDueDay(String(editing?.dueDay ?? 10));
    setIsActive(editing?.isActive ?? true);
    setError(null);
  }, [bill, editing, fin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await saveRecurringBillAction(editing?.id ?? null, {
      description,
      category,
      supplier: supplier || null,
      amountCents: amount ?? 0,
      dueDay: Number(dueDay),
      isActive,
    });
    setBusy(false);
    if (!result.ok) return setError(result.error ?? "Erro ao salvar.");
    onDone();
  }

  return (
    <Modal open={!!bill} onClose={onClose} title={editing ? "Editar conta fixa" : "Nova conta fixa"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="rb-desc">Descrição</FieldLabel>
          <Input id="rb-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Luz" required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="rb-cat">Categoria</FieldLabel>
            <Select id="rb-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              {fin.categoryChoices(category).map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="rb-sup">Empresa (opcional)</FieldLabel>
            <Input id="rb-sup" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Ex.: CPFL" />
          </div>
          <div>
            <FieldLabel htmlFor="rb-amount">Valor médio</FieldLabel>
            <MoneyInput id="rb-amount" value={amount} allowEmpty onChange={setAmount} />
          </div>
          <div>
            <FieldLabel htmlFor="rb-day">Vence todo dia</FieldLabel>
            <Input id="rb-day" type="number" min={1} max={31} inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-brand-graphite">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-brand-beige" />
          Ativa (gera a conta todo mês)
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
