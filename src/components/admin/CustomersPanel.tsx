"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Pencil, Plus, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, FieldLabel } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { NewAppointmentModal } from "@/components/admin/NewAppointmentModal";
import { formatPhoneDisplay } from "@/lib/utils/phone";
import { formatShortDatePtBR } from "@/lib/utils/date-format";
import {
  updateCustomerNotesAction,
  getCustomerAppointmentsAction,
  saveCustomerAction,
} from "@/lib/actions/admin/customers";
import { matchesCustomerSearch } from "@/lib/utils/customer-search";
import { cn } from "@/lib/utils/cn";
import type { Customer, AppointmentWithRelations } from "@/types";

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
                      selectedId === c.id ? "bg-brand-forest text-brand-cream" : "text-brand-graphite hover:bg-brand-cream"
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
            <h3 className="mb-4 font-serif text-lg text-brand-forest">Histórico de agendamentos</h3>
            {history.length === 0 ? (
              <p className="text-sm text-brand-graphite/60">Nenhum agendamento encontrado.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-brand-beige px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-brand-graphite">{a.service.name}</p>
                      <p className="text-xs text-brand-graphite/60">
                        {formatShortDatePtBR(a.date)} · {a.startTime}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(customer?.fullName ?? "");
    setPhone(customer ? formatPhoneDisplay(customer.phone) : "");
    setEmail(customer?.email ?? "");
    setError(null);
  }, [open, customer]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await saveCustomerAction(customer?.id ?? null, { fullName, phone, email });
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
