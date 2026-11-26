"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, HandCoins, MessageCircle, Pencil, Plus, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, FieldLabel, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { NewAppointmentModal } from "@/components/admin/NewAppointmentModal";
import { SaleModal } from "@/components/admin/SaleModal";
import { AppointmentDetailModal } from "@/components/admin/AppointmentDetailModal";
import { ReceivePaymentModal } from "@/components/admin/ReceivePaymentModal";
import { SaleStatusBadge } from "@/components/admin/FinanceBadges";
import { listSalesAction } from "@/lib/actions/admin/sales";
import { buildChargeLink, openAmount } from "@/lib/finance/charge";
import { formatBRL } from "@/lib/utils/money";
import { formatPhoneDisplay } from "@/lib/utils/phone";
import { formatShortDatePtBR } from "@/lib/utils/date-format";
import { BIRTH_YEAR_UNKNOWN, MONTHS, formatBirthDate } from "@/lib/utils/birthday";
import {
  updateCustomerNotesAction,
  getCustomerAppointmentsAction,
  saveCustomerAction,
} from "@/lib/actions/admin/customers";
import { matchesCustomerSearch } from "@/lib/utils/customer-search";
import { cn } from "@/lib/utils/cn";
import type { Customer, AppointmentWithRelations, Sale } from "@/types";

interface CustomersPanelProps {
  customers: Customer[];
  initialCustomerId?: string;
}

export function CustomersPanel({ customers, initialCustomerId }: CustomersPanelProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(
    customers.find((c) => c.id === initialCustomerId)?.id ?? customers[0]?.id ?? null
  );
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<AppointmentWithRelations[]>([]);
  const [notesDraft, setNotesDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [receiving, setReceiving] = useState<Sale | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const selected = customers.find((c) => c.id === selectedId) ?? null;
  const filtered = useMemo(() => customers.filter((c) => matchesCustomerSearch(c, query)), [customers, query]);

  function selectCustomer(customer: Customer) {
    setSelectedId(customer.id);
    // Abaixo de lg a lista fica em cima do detalhe; sem isso a troca acontece fora da tela.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  useEffect(() => {
    if (!selectedId) return;
    const customer = customers.find((c) => c.id === selectedId);
    setNotesDraft(customer?.notes ?? "");
    setDirty(false);
    getCustomerAppointmentsAction(selectedId).then(setHistory);
    listSalesAction({ customerId: selectedId }).then(setCustomerSales);
    // Só ao trocar de cliente — um refresh da lista não pode apagar observações em edição.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function handleSaveNotes() {
    if (!selected) return;
    setSaving(true);
    await updateCustomerNotesAction(selected.id, notesDraft);
    setSaving(false);
    setDirty(false);
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <Card className="flex max-h-96 flex-col p-3 lg:max-h-[75vh]">
        <div className="mb-2 flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-graphite/40" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome ou telefone"
              aria-label="Buscar cliente"
              className="!py-2 pl-9"
            />
          </div>
          <Button
            className="!px-3 !py-2"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            aria-label="Novo cliente"
            title="Novo cliente"
          >
            <Plus size={16} />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {filtered.length === 0 ? (
            <p className="p-3 text-sm text-brand-graphite/60">
              {customers.length === 0 ? "Nenhum cliente cadastrado." : "Nenhum cliente encontrado."}
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => selectCustomer(c)}
                    className={cn(
                      "w-full rounded-xl px-3 py-2.5 text-left text-sm transition",
                      selectedId === c.id ? "bg-brand-forest text-brand-ink" : "text-brand-graphite hover:bg-brand-cream"
                    )}
                  >
                    <p className="font-medium">{c.fullName}</p>
                    <p className={cn("text-xs", selectedId === c.id ? "text-brand-cream/70" : "text-brand-graphite/50")}>
                      {formatPhoneDisplay(c.phone)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {selected ? (
        <div ref={detailRef} className="scroll-mt-20 space-y-6">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words font-serif text-xl text-brand-forest">{selected.fullName}</h2>
                <p className="mt-1 text-sm text-brand-graphite/70">{formatPhoneDisplay(selected.phone)}</p>
                {selected.email ? <p className="break-all text-sm text-brand-graphite/70">{selected.email}</p> : null}
                {selected.birthDate ? (
                  <p className="text-sm text-brand-graphite/70">Aniversário: {formatBirthDate(selected.birthDate)}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="!px-3 !py-1.5 text-xs"
                  onClick={() => {
                    setEditing(selected);
                    setFormOpen(true);
                  }}
                >
                  <Pencil size={14} /> Editar
                </Button>
                <Button className="!px-3 !py-1.5 text-xs" onClick={() => setBookingOpen(true)}>
                  <CalendarPlus size={14} /> Agendar
                </Button>
              </div>
            </div>

            <div className="mt-5">
              <FieldLabel htmlFor="customer-notes">Observações internas</FieldLabel>
              <p className="mb-2 text-xs text-brand-graphite/50">
                Uso interno da equipe (ex.: preferências de horário). Nunca registre dados de saúde aqui.
              </p>
              <Textarea
                id="customer-notes"
                rows={3}
                value={notesDraft}
                onChange={(e) => {
                  setNotesDraft(e.target.value);
                  setDirty(true);
                }}
              />
              <div className="mt-2 flex items-center gap-3">
                <Button variant="secondary" onClick={handleSaveNotes} disabled={saving || !dirty}>
                  {saving ? "Salvando..." : "Salvar observações"}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-serif text-lg text-brand-forest">Pendências e compras</h3>
              <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => setPendingOpen(true)}>
                <Plus size={14} /> Lançar pendência
              </Button>
            </div>
            {(() => {
              const open = customerSales.filter((s) => s.status === "open");
              const totalOpen = open.reduce((sum, s) => sum + openAmount(s), 0);
              return totalOpen > 0 ? (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p>
                    Em aberto: <strong className="tabular-nums">{formatBRL(totalOpen)}</strong>
                  </p>
                  <a
                    href={buildChargeLink(selected.phone, selected.fullName, open)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-brand-graphite"
                  >
                    <MessageCircle size={14} /> Cobrar no WhatsApp
                  </a>
                </div>
              ) : null;
            })()}
            {customerSales.length === 0 ? (
              <p className="text-sm text-brand-graphite/60">Nenhuma compra registrada.</p>
            ) : (
              <ul className="space-y-2">
                {customerSales.slice(0, 15).map((sale) => (
                  <li key={sale.id} className="rounded-xl border border-brand-beige px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-brand-graphite">{sale.items.map((i) => `${i.description}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ")}</p>
                        <p className="text-xs text-brand-graphite/60">{formatShortDatePtBR(sale.saleDate)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <SaleStatusBadge status={sale.status} partial={sale.paidCents > 0} />
                        <span className="font-medium tabular-nums">{formatBRL(sale.totalCents)}</span>
                      </div>
                    </div>
                    {sale.status === "open" ? (
                      <Button className="mt-2 !px-3 !py-1.5 text-xs" onClick={() => setReceiving(sale)}>
                        <HandCoins size={14} /> Receber {formatBRL(openAmount(sale))}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 font-serif text-lg text-brand-forest">Histórico de agendamentos</h3>
            {history.length === 0 ? (
              <p className="text-sm text-brand-graphite/60">Nenhum agendamento encontrado.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setDetailId(a.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-brand-beige px-4 py-3 text-left text-sm transition hover:border-brand-moss"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-brand-graphite">{a.service.name}</p>
                        <p className="text-xs text-brand-graphite/60">
                          {formatShortDatePtBR(a.date)} · {a.startTime}
                        </p>
                      </div>
                      <StatusBadge status={a.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}

      <CustomerFormModal
        open={formOpen}
        customer={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(customer) => {
          setFormOpen(false);
          setSelectedId(customer.id);
          router.refresh();
        }}
      />

      <SaleModal
        open={pendingOpen}
        mode="pending"
        prefill={selected ? { customerId: selected.id } : null}
        onClose={() => setPendingOpen(false)}
        onCompleted={() => {
          setPendingOpen(false);
          if (selectedId) listSalesAction({ customerId: selectedId }).then(setCustomerSales);
        }}
      />
      <AppointmentDetailModal
        appointmentId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        onMutated={() => {
          if (!selectedId) return;
          getCustomerAppointmentsAction(selectedId).then(setHistory);
          listSalesAction({ customerId: selectedId }).then(setCustomerSales);
        }}
      />
      <ReceivePaymentModal
        sale={receiving}
        onClose={() => setReceiving(null)}
        onCompleted={() => {
          setReceiving(null);
          if (selectedId) listSalesAction({ customerId: selectedId }).then(setCustomerSales);
        }}
      />

      <NewAppointmentModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        initialCustomerId={selected?.id}
        onCreated={() => {
          setBookingOpen(false);
          if (selectedId) getCustomerAppointmentsAction(selectedId).then(setHistory);
        }}
      />
    </div>
  );
}

function CustomerFormModal({
  open,
  customer,
  onClose,
  onSaved,
}: {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birth, setBirth] = useState({ day: "", month: "", year: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(customer?.fullName ?? "");
    setPhone(customer ? formatPhoneDisplay(customer.phone) : "");
    setEmail(customer?.email ?? "");
    const [y, m, d] = customer?.birthDate?.split("-") ?? [];
    setBirth({ day: d ? String(Number(d)) : "", month: m ? String(Number(m)) : "", year: y && y !== BIRTH_YEAR_UNKNOWN ? y : "" });
    setError(null);
  }, [open, customer]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Boolean(birth.day) !== Boolean(birth.month)) {
      setError("Para o aniversário, escolha o dia e o mês (o ano é opcional).");
      return;
    }
    if (birth.year && !/^\d{4}$/.test(birth.year)) {
      setError("Ano de nascimento com 4 números, ou deixe em branco.");
      return;
    }
    const birthDate =
      birth.day && birth.month
        ? `${birth.year || BIRTH_YEAR_UNKNOWN}-${birth.month.padStart(2, "0")}-${birth.day.padStart(2, "0")}`
        : "";
    setSaving(true);
    setError(null);
    const result = await saveCustomerAction(customer?.id ?? null, { fullName, phone, email, birthDate });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved(result.customer);
  }

  return (
    <Modal open={open} onClose={onClose} title={customer ? "Editar cliente" : "Novo cliente"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="c-name">Nome completo</FieldLabel>
          <Input id="c-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div>
          <FieldLabel htmlFor="c-phone">WhatsApp com DDD</FieldLabel>
          <Input id="c-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <p className="mt-1.5 text-xs text-brand-graphite/50">
            É pelo telefone que os pedidos de agendamento do site são ligados a esta ficha.
          </p>
        </div>
        <div>
          <FieldLabel htmlFor="c-email">E-mail (opcional)</FieldLabel>
          <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-brand-graphite">Aniversário (opcional)</legend>
          <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2">
            <Select aria-label="Dia" value={birth.day} onChange={(e) => setBirth((b) => ({ ...b, day: e.target.value }))}>
              <option value="">Dia</option>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </Select>
            <Select aria-label="Mês" value={birth.month} onChange={(e) => setBirth((b) => ({ ...b, month: e.target.value }))}>
              <option value="">Mês</option>
              {MONTHS.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </Select>
            <Input
              aria-label="Ano (opcional)"
              inputMode="numeric"
              maxLength={4}
              placeholder="Ano"
              value={birth.year}
              onChange={(e) => setBirth((b) => ({ ...b, year: e.target.value.replace(/\D/g, "") }))}
            />
          </div>
          <p className="mt-1.5 text-xs text-brand-graphite/50">Aparece no Início na semana do aniversário. Só peça se a cliente quiser contar.</p>
        </fieldset>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
