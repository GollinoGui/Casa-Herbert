"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck2, CalendarPlus, MessageCircle, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/Field";
import { EmptyState } from "@/components/admin/EmptyState";
import { CustomerPicker } from "@/components/admin/CustomerPicker";
import { NewAppointmentModal } from "@/components/admin/NewAppointmentModal";
import { addToWaitlistAction, setWaitlistStatusAction } from "@/lib/actions/admin/waitlist";
import { listCustomersAction } from "@/lib/actions/admin/customers";
import { listActiveServicesAction } from "@/lib/actions/admin/services";
import { buildWhatsAppLink } from "@/lib/booking/whatsapp";
import { addDaysToDateStr, formatLongDatePtBR, formatShortDatePtBR, formatWeekdayPtBR, todayDateStr } from "@/lib/utils/date-format";
import { cn } from "@/lib/utils/cn";
import type { Customer, Service, WaitlistEntry, WaitlistPeriod } from "@/types";
import type { WaitlistOpening } from "@/lib/data/waitlist";

export const PERIOD_LABEL: Record<WaitlistPeriod, string> = {
  any: "Qualquer horário",
  morning: "De manhã",
  afternoon: "À tarde",
};

export function WaitlistManager({ entries, openings }: { entries: WaitlistEntry[]; openings: WaitlistOpening[] }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [booking, setBooking] = useState<WaitlistEntry | null>(null);
  const openingById = new Map(openings.map((o) => [o.entry.id, o.startTime]));

  async function setStatus(entry: WaitlistEntry, status: "scheduled" | "cancelled") {
    await setWaitlistStatusAction(entry.id, status);
    router.refresh();
  }

  // Agrupa por dia pedido.
  const byDate = new Map<string, WaitlistEntry[]>();
  for (const e of entries) byDate.set(e.desiredDate, [...(byDate.get(e.desiredDate) ?? []), e]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-graphite/70">
          {openings.length
            ? `${openings.length} pessoa(s) já podem ser encaixadas.`
            : entries.length
              ? "Ninguém da lista tem vaga por enquanto."
              : ""}
        </p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Adicionar à lista
        </Button>
      </div>

      {entries.length === 0 ? (
        <Card className="p-6">
          <EmptyState compact title="Lista de espera vazia" hint="Quando um dia estiver cheio, anote aqui quem queria aquele dia." />
        </Card>
      ) : (
        <div className="space-y-5">
          {[...byDate].map(([date, list]) => (
            <section key={date}>
              <h2 className="mb-2 font-serif text-lg text-brand-forest">
                {formatWeekdayPtBR(date)}, {formatShortDatePtBR(date)}
              </h2>
              <ul data-cascata className="grid gap-3 md:grid-cols-2">
                {list.map((entry) => {
                  const slot = openingById.get(entry.id);
                  const message = slot
                    ? `Oi, ${entry.customer.fullName.split(" ")[0]}! Abriu um horário na Casa Herbert em ${formatLongDatePtBR(entry.desiredDate)}, às ${slot}. Quer que a gente reserve para você? 🌿`
                    : "";
                  return (
                    <li key={entry.id}>
                      <Card className={cn("p-4", slot && "border-brand-sage ring-1 ring-brand-sage/40")}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-brand-graphite">{entry.customer.fullName}</p>
                            <p className="text-xs text-brand-graphite/60">
                              {entry.serviceName ?? "Serviço a combinar"} · {PERIOD_LABEL[entry.period]}
                            </p>
                            {entry.notes ? <p className="mt-1 text-xs italic text-brand-graphite/70">{entry.notes}</p> : null}
                          </div>
                          {slot ? (
                            <span className="shrink-0 rounded-full bg-brand-sage/20 px-2 py-0.5 text-[11px] font-semibold text-brand-moss">
                              Vaga às {slot}
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-brand-cream px-2 py-0.5 text-[11px] font-medium text-brand-graphite/60">
                              Esperando
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {slot ? (
                            <a
                              href={buildWhatsAppLink(entry.customer.phone, message)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-brand-beige px-3 text-xs font-medium text-brand-moss transition hover:border-brand-sage hover:bg-brand-sage/10"
                            >
                              <MessageCircle size={14} aria-hidden="true" /> Avisar
                            </a>
                          ) : null}
                          <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => setBooking(entry)}>
                            <CalendarPlus size={14} /> Agendar
                          </Button>
                          <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => setStatus(entry, "cancelled")}>
                            <X size={14} /> Tirar da lista
                          </Button>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <WaitlistModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false);
          router.refresh();
        }}
      />
      <NewAppointmentModal
        open={!!booking}
        onClose={() => setBooking(null)}
        initialCustomerId={booking?.customer.id}
        initialDate={booking?.desiredDate}
        initialStartTime={booking ? openingById.get(booking.id) : undefined}
        onCreated={async () => {
          if (booking) await setWaitlistStatusAction(booking.id, "scheduled");
          setBooking(null);
          router.refresh();
        }}
      />
    </div>
  );
}

export function WaitlistModal({
  open,
  onClose,
  onSaved,
  customerId: fixedCustomerId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  customerId?: string;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(addDaysToDateStr(todayDateStr(), 1));
  const [period, setPeriod] = useState<WaitlistPeriod>("any");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCustomerId(fixedCustomerId ?? "");
    setServiceId("");
    setDate(addDaysToDateStr(todayDateStr(), 1));
    setPeriod("any");
    setNotes("");
    setError(null);
    listActiveServicesAction().then(setServices);
    if (!fixedCustomerId) listCustomersAction().then(setCustomers);
  }, [open, fixedCustomerId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) return setError("Escolha a cliente.");
    setSaving(true);
    setError(null);
    const result = await addToWaitlistAction({
      customerId,
      serviceId: serviceId || null,
      desiredDate: date,
      period,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (!result.ok) return setError(result.error);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Adicionar à lista de espera">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!fixedCustomerId ? (
          <div>
            <FieldLabel>Cliente</FieldLabel>
            <CustomerPicker customers={customers} value={customerId} onChange={setCustomerId} emptyLabel="Escolha a cliente" />
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="wl-date">Dia que ela queria</FieldLabel>
            <Input id="wl-date" type="date" min={todayDateStr()} value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <FieldLabel htmlFor="wl-period">Período</FieldLabel>
            <Select id="wl-period" value={period} onChange={(e) => setPeriod(e.target.value as WaitlistPeriod)}>
              {(Object.keys(PERIOD_LABEL) as WaitlistPeriod[]).map((p) => (
                <option key={p} value={p}>
                  {PERIOD_LABEL[p]}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="wl-service">Serviço (opcional)</FieldLabel>
          <Select id="wl-service" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">A combinar</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-brand-graphite/50">Com o serviço, o aviso de vaga considera a duração certa.</p>
        </div>
        <div>
          <FieldLabel htmlFor="wl-notes">Observação (opcional)</FieldLabel>
          <Textarea id="wl-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: só depois das 16h" />
        </div>
        <p className="flex items-start gap-2 text-xs text-brand-graphite/60">
          <CalendarCheck2 size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          Quando abrir um horário nesse dia (um cancelamento, por exemplo), o sino avisa.
        </p>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Adicionar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
