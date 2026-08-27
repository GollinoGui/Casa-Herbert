"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Textarea, FieldLabel } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { formatPhoneDisplay } from "@/lib/utils/phone";
import { formatShortDatePtBR } from "@/lib/utils/date-format";
import { updateCustomerNotesAction, getCustomerAppointmentsAction } from "@/lib/actions/admin/customers";
import { cn } from "@/lib/utils/cn";
import type { Customer, AppointmentWithRelations } from "@/types";

export function CustomersPanel({ customers }: { customers: Customer[] }) {
  const [selected, setSelected] = useState<Customer | null>(customers[0] ?? null);
  const [history, setHistory] = useState<AppointmentWithRelations[]>([]);
  const [notesDraft, setNotesDraft] = useState(selected?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!selected) return;
    setNotesDraft(selected.notes ?? "");
    setDirty(false);
    getCustomerAppointmentsAction(selected.id).then(setHistory);
  }, [selected]);

  async function handleSaveNotes() {
    if (!selected) return;
    setSaving(true);
    await updateCustomerNotesAction(selected.id, notesDraft);
    setSaving(false);
    setDirty(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <Card className="max-h-[70vh] overflow-y-auto p-3">
        {customers.length === 0 ? (
          <p className="p-3 text-sm text-brand-graphite/60">Nenhum cliente cadastrado.</p>
        ) : (
          <ul className="space-y-1">
            {customers.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setSelected(c)}
                  className={cn(
                    "w-full rounded-xl px-3 py-2.5 text-left text-sm transition",
                    selected?.id === c.id ? "bg-brand-forest text-brand-cream" : "text-brand-graphite hover:bg-brand-cream"
                  )}
                >
                  <p className="font-medium">{c.fullName}</p>
                  <p className={cn("text-xs", selected?.id === c.id ? "text-brand-cream/70" : "text-brand-graphite/50")}>
                    {formatPhoneDisplay(c.phone)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {selected ? (
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-serif text-xl text-brand-forest">{selected.fullName}</h2>
            <p className="mt-1 text-sm text-brand-graphite/70">{formatPhoneDisplay(selected.phone)}</p>
            {selected.email ? <p className="text-sm text-brand-graphite/70">{selected.email}</p> : null}

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
                    className="flex items-center justify-between rounded-xl border border-brand-beige px-4 py-3 text-sm"
                  >
                    <div>
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
    </div>
  );
}
