"use client";

import { useEffect, useMemo, useState } from "react";
import { MoveHorizontal, X } from "lucide-react";
import { formatShortDatePtBR } from "@/lib/utils/date-format";
import type { CustomerRecord } from "@/types";

interface ComparablePhoto {
  id: string;
  url: string;
  date: string;
  label: string;
}

/** Todas as fotos com URL, da mais antiga para a mais nova. */
export function comparablePhotos(records: CustomerRecord[]): ComparablePhoto[] {
  const list = records
    .flatMap((r) => r.photos.filter((p) => p.url).map((p) => ({ id: p.id, url: p.url!, date: r.date })))
    .sort((a, b) => a.date.localeCompare(b.date));
  const perDate = new Map<string, number>();
  return list.map((p) => {
    const n = (perDate.get(p.date) ?? 0) + 1;
    perDate.set(p.date, n);
    const sameDay = list.filter((q) => q.date === p.date).length;
    return { ...p, label: `${formatShortDatePtBR(p.date)}${sameDay > 1 ? ` (foto ${n})` : ""}` };
  });
}

/** Duas fotos sobrepostas: a barra arrastável revela o "depois" sobre o "antes". */
export function BeforeAfterCompare({ records, onClose }: { records: CustomerRecord[]; onClose: () => void }) {
  const photos = useMemo(() => comparablePhotos(records), [records]);
  const [beforeId, setBeforeId] = useState(photos[0]?.id ?? "");
  const [afterId, setAfterId] = useState(photos[photos.length - 1]?.id ?? "");
  const [split, setSplit] = useState(50);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const before = photos.find((p) => p.id === beforeId);
  const after = photos.find((p) => p.id === afterId);
  if (!before || !after) return null;

  const select = (id: string, value: string, onChange: (v: string) => void, label: string) => (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-snow/80">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 rounded-xl border border-snow/20 bg-brand-ink px-3 text-sm text-snow"
        id={id}
      >
        {photos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Comparar antes e depois"
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-brand-ink/90 p-4"
    >
      <button
        type="button"
        aria-label="Fechar comparação"
        className="absolute right-4 top-4 rounded-full bg-snow/90 p-2 text-brand-graphite"
        onClick={onClose}
      >
        <X size={18} />
      </button>

      <div className="flex w-full max-w-xl flex-wrap gap-3 pr-12 sm:pr-0">
        {select("comparar-antes", beforeId, setBeforeId, "Antes")}
        {select("comparar-depois", afterId, setAfterId, "Depois")}
      </div>

      <div className="relative w-full max-w-xl select-none overflow-hidden rounded-2xl bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada e temporária */}
        <img src={before.url} alt={`Antes: ${before.label}`} className="block max-h-[65vh] w-full object-contain" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada e temporária */}
        <img
          src={after.url}
          alt={`Depois: ${after.label}`}
          className="absolute inset-0 h-full w-full object-contain"
          style={{ clipPath: `inset(0 0 0 ${split}%)` }}
          draggable={false}
        />
        <span className="pointer-events-none absolute inset-y-0 w-0.5 bg-snow/90" style={{ left: `${split}%` }} aria-hidden="true">
          <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-snow text-brand-graphite shadow-softer">
            <MoveHorizontal size={16} />
          </span>
        </span>
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-brand-ink/70 px-2 py-0.5 text-[11px] text-snow">
          Antes · {formatShortDatePtBR(before.date)}
        </span>
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-brand-ink/70 px-2 py-0.5 text-[11px] text-snow">
          Depois · {formatShortDatePtBR(after.date)}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={split}
          onChange={(e) => setSplit(Number(e.target.value))}
          aria-label="Arraste para comparar"
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
      <p className="text-xs text-snow/60">Arraste a barra (ou use as setas do teclado) para comparar.</p>
    </div>
  );
}
