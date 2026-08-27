"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, FieldLabel } from "@/components/ui/Field";
import { upsertSpecialHoursAction, deleteSpecialHoursAction } from "@/lib/actions/admin/special-hours";
import { formatShortDatePtBR, formatWeekdayPtBR } from "@/lib/utils/date-format";
import type { SpecialHours, TimeRange } from "@/types";

export function SpecialHoursManager({ items }: { items: SpecialHours[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SpecialHours | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Remover este horário especial?")) return;
    await deleteSpecialHoursAction(id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={16} /> Novo horário especial
        </Button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-brand-graphite/60">Nenhum horário especial cadastrado.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl border border-brand-beige bg-white p-4">
              <div>
                <p className="font-medium text-brand-graphite">
                  {formatShortDatePtBR(item.date)} · {formatWeekdayPtBR(item.date)}
                </p>
                <p className="text-sm text-brand-graphite/60">
                  {item.isClosed ? "Fechado" : item.ranges.map((r) => `${r.startTime}–${r.endTime}`).join(", ")}
                </p>
                {item.reason ? <p className="mt-1 text-xs text-brand-graphite/50">{item.reason}</p> : null}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(item);
                    setModalOpen(true);
                  }}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-brand-forest hover:bg-brand-cream"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="rounded-lg p-1.5 text-brand-graphite/50 hover:bg-red-50 hover:text-red-600"
                  aria-label="Remover"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <SpecialHoursFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        item={editing}
        onSaved={() => {
          setModalOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function SpecialHoursFormModal({
  open,
  onClose,
  item,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  item: SpecialHours | null;
  onSaved: () => void;
}) {
  const [date, setDate] = useState("");
  const [isClosed, setIsClosed] = useState(true);
  const [ranges, setRanges] = useState<TimeRange[]>([{ startTime: "09:00", endTime: "18:00" }]);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDate(item?.date ?? "");
      setIsClosed(item?.isClosed ?? true);
      setRanges(item?.ranges.length ? item.ranges : [{ startTime: "09:00", endTime: "18:00" }]);
      setReason(item?.reason ?? "");
      setError(null);
    }
  }, [open, item]);

  function updateRange(index: number, key: keyof TimeRange, value: string) {
    setRanges((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  }
  function addRange() {
    setRanges((prev) => [...prev, { startTime: "09:00", endTime: "18:00" }]);
  }
  function removeRange(index: number) {
    setRanges((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) {
      setError("Selecione uma data.");
      return;
    }
    if (!isClosed && ranges.length === 0) {
      setError("Adicione ao menos um intervalo de horário ou marque como fechado.");
      return;
    }
    setSaving(true);
    setError(null);
    await upsertSpecialHoursAction({ date, isClosed, reason: reason || undefined, ranges: isClosed ? [] : ranges });
    setSaving(false);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={item ? "Editar horário especial" : "Novo horário especial"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="special-date">Data</FieldLabel>
          <Input id="special-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!!item} />
        </div>

        <label className="flex items-center gap-2 text-sm text-brand-graphite">
          <input
            type="checkbox"
            checked={isClosed}
            onChange={(e) => setIsClosed(e.target.checked)}
            className="h-4 w-4 rounded border-brand-beige"
          />
          Fechado neste dia
        </label>

        {!isClosed ? (
          <div className="space-y-2">
            <FieldLabel>Horários de atendimento</FieldLabel>
            {ranges.map((range, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input type="time" value={range.startTime} onChange={(e) => updateRange(index, "startTime", e.target.value)} />
                <span className="text-brand-graphite/50">até</span>
                <Input type="time" value={range.endTime} onChange={(e) => updateRange(index, "endTime", e.target.value)} />
                <button
                  type="button"
                  onClick={() => removeRange(index)}
                  className="rounded-lg p-1.5 text-brand-graphite/40 hover:bg-red-50 hover:text-red-600"
                  aria-label="Remover intervalo"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button type="button" onClick={addRange} className="text-xs font-medium text-brand-forest hover:underline">
              + Adicionar intervalo
            </button>
          </div>
        ) : null}

        <div>
          <FieldLabel htmlFor="special-reason">Motivo (opcional)</FieldLabel>
          <Input id="special-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: Véspera de Natal" />
        </div>

        {error ? <p className="text-xs text-red-600">{error}</p> : null}

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
