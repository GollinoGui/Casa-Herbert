"use client";

import { useRef, useState } from "react";
import { Camera, Columns2, ImageOff, NotebookPen, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Textarea } from "@/components/ui/Field";
import { EmptyState } from "@/components/admin/EmptyState";
import { BeforeAfterCompare, comparablePhotos } from "@/components/admin/BeforeAfterCompare";
import {
  deleteCustomerRecordAction,
  deleteCustomerRecordPhotoAction,
  saveCustomerRecordAction,
  setPhotoConsentAction,
  uploadCustomerRecordPhotoAction,
} from "@/lib/actions/admin/customer-records";
import { prepareImageForUpload } from "@/lib/utils/image-resize";
import { formatShortDatePtBR, todayDateStr } from "@/lib/utils/date-format";
import type { Customer, CustomerRecord } from "@/types";

/**
 * Acompanhamento capilar: anotações por data e fotos de evolução. As fotos ficam
 * num bucket privado e só aparecem por URL assinada (expira), nunca no site.
 * Linguagem de cuidado, não de diagnóstico.
 */
export function CustomerRecordsCard({
  customer,
  records,
  onChanged,
}: {
  customer: Customer;
  records: CustomerRecord[];
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState(todayDateStr());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const canCompare = comparablePhotos(records).length >= 2;
  const consented = !!customer.photoConsentAt;

  async function toggleConsent() {
    if (consented && !window.confirm("Retirar a autorização? As fotos já salvas continuam na ficha; apague-as se a cliente pedir.")) return;
    setBusy(true);
    const result = await setPhotoConsentAction(customer.id, !consented);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onChanged();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await saveCustomerRecordAction(null, { customerId: customer.id, date, appointmentId: null, notes: notes.trim() || null });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setAdding(false);
    setNotes("");
    setDate(todayDateStr());
    onChanged();
  }

  async function handleDelete(record: CustomerRecord) {
    if (!window.confirm(`Apagar o registro de ${formatShortDatePtBR(record.date)}${record.photos.length ? " e as fotos dele" : ""}?`)) return;
    setBusy(true);
    await deleteCustomerRecordAction(record.id);
    setBusy(false);
    onChanged();
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-serif text-lg text-brand-forest">
          <NotebookPen size={18} strokeWidth={1.75} className="text-brand-moss" aria-hidden="true" /> Acompanhamento capilar
        </h3>
        <div className="flex flex-wrap gap-2">
          {canCompare ? (
            <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => setComparing(true)}>
              <Columns2 size={14} /> Antes e depois
            </Button>
          ) : null}
          <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => setAdding((v) => !v)}>
            <Plus size={14} /> Novo registro
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-beige bg-brand-cream/40 px-3 py-2.5 text-sm">
        <p className="flex items-center gap-2 text-brand-graphite/80">
          <ShieldCheck size={16} className={consented ? "text-brand-moss" : "text-brand-graphite/40"} aria-hidden="true" />
          {consented
            ? `Fotos autorizadas pela cliente em ${formatShortDatePtBR(customer.photoConsentAt!.slice(0, 10))}.`
            : "Fotos só com a autorização da cliente."}
        </p>
        <button type="button" onClick={toggleConsent} disabled={busy} className="text-xs font-medium text-brand-moss hover:underline">
          {consented ? "Retirar autorização" : "A cliente autorizou"}
        </button>
      </div>

      {adding ? (
        <form onSubmit={handleCreate} className="mb-4 space-y-3 rounded-xl border border-brand-beige p-3">
          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <div>
              <FieldLabel htmlFor="rec-date">Data</FieldLabel>
              <Input id="rec-date" type="date" value={date} max={todayDateStr()} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <FieldLabel htmlFor="rec-notes">Anotação</FieldLabel>
              <Textarea
                id="rec-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: protocolo da sessão, produtos usados, o que combinar para o próximo encontro."
              />
            </div>
          </div>
          <p className="text-xs text-brand-graphite/50">Registre o cuidado e a evolução, sem diagnóstico. As fotos entram depois de salvar.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              Salvar registro
            </Button>
          </div>
        </form>
      ) : null}

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

      {records.length === 0 ? (
        <EmptyState compact title="Nenhum registro ainda" hint="Anote cada sessão e compare as fotos ao longo do protocolo." />
      ) : (
        <ol className="space-y-3">
          {records.map((record) => (
            <RecordItem
              key={record.id}
              record={record}
              canUpload={consented}
              onView={setViewing}
              onDelete={() => handleDelete(record)}
              onChanged={onChanged}
            />
          ))}
        </ol>
      )}

      {comparing ? <BeforeAfterCompare records={records} onClose={() => setComparing(false)} /> : null}

      {viewing ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Foto do acompanhamento"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-ink/80 p-4"
          onClick={() => setViewing(null)}
        >
          <button
            type="button"
            aria-label="Fechar foto"
            className="absolute right-4 top-4 rounded-full bg-snow/90 p-2 text-brand-graphite"
            onClick={() => setViewing(null)}
          >
            <X size={18} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada e temporária, fora do otimizador */}
          <img src={viewing} alt="Foto do acompanhamento" className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
        </div>
      ) : null}
    </Card>
  );
}

function RecordItem({
  record,
  canUpload,
  onView,
  onDelete,
  onChanged,
}: {
  record: CustomerRecord;
  canUpload: boolean;
  onView: (url: string) => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(record.notes ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    for (const file of Array.from(files)) {
      try {
        const prepared = await prepareImageForUpload(file);
        const form = new FormData();
        form.set("recordId", record.id);
        form.set("file", prepared.blob, file.name);
        const result = await uploadCustomerRecordPhotoAction(form);
        if (!result.ok) {
          setError(result.error);
          break;
        }
      } catch {
        setError("Não deu para ler essa imagem. Tente outra foto.");
        break;
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    onChanged();
  }

  async function saveNotes() {
    const result = await saveCustomerRecordAction(record.id, {
      customerId: record.customerId,
      date: record.date,
      appointmentId: record.appointmentId,
      notes: draft.trim() || null,
    });
    if (!result.ok) return setError(result.error);
    setEditing(false);
    onChanged();
  }

  async function removePhoto(id: string) {
    if (!window.confirm("Apagar esta foto?")) return;
    await deleteCustomerRecordPhotoAction(id);
    onChanged();
  }

  return (
    <li className="relative rounded-xl border border-brand-beige p-3 pl-5 before:absolute before:inset-y-3 before:left-2 before:w-0.5 before:rounded-full before:bg-brand-sage/60">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-brand-graphite">{formatShortDatePtBR(record.date)}</p>
        <div className="flex items-center gap-1">
          {canUpload ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                id={`rec-photo-${record.id}`}
                onChange={(e) => handleFiles(e.target.files)}
              />
              <label
                htmlFor={`rec-photo-${record.id}`}
                className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full px-2.5 text-xs font-medium text-brand-moss hover:bg-brand-sage/10"
              >
                <Camera size={14} aria-hidden="true" /> {uploading ? "Enviando..." : "Foto"}
              </label>
            </>
          ) : null}
          <button type="button" onClick={() => setEditing((v) => !v)} className="min-h-9 rounded-full px-2.5 text-xs font-medium text-brand-moss hover:bg-brand-sage/10">
            Editar
          </button>
          <button type="button" onClick={onDelete} aria-label="Apagar registro" className="rounded-full p-2 text-brand-graphite/50 hover:text-red-600">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <Textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Anotação" />
          <div className="flex gap-2">
            <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button className="!px-3 !py-1.5 text-xs" onClick={saveNotes}>
              Salvar
            </Button>
          </div>
        </div>
      ) : record.notes ? (
        <p className="mt-1 whitespace-pre-line text-sm text-brand-graphite/80">{record.notes}</p>
      ) : null}
      {record.photos.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {record.photos.map((photo) => (
            <li key={photo.id} className="group relative">
              {photo.url ? (
                <button type="button" onClick={() => onView(photo.url!)} className="block overflow-hidden rounded-lg border border-brand-beige">
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada e temporária */}
                  <img src={photo.url} alt={`Foto de ${formatShortDatePtBR(record.date)}`} className="h-20 w-20 object-cover" loading="lazy" />
                </button>
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-brand-beige text-brand-graphite/40">
                  <ImageOff size={18} aria-label="Foto indisponível" />
                </span>
              )}
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                aria-label="Apagar foto"
                className="absolute -right-1.5 -top-1.5 rounded-full bg-snow p-1 text-brand-graphite/60 shadow-softer hover:text-red-600"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </li>
  );
}
