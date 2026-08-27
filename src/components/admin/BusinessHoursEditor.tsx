"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { replaceBusinessHoursForWeekdayAction } from "@/lib/actions/admin/business-hours";
import { WEEKDAY_LABELS } from "@/lib/booking/constants";
import { formatShortDatePtBR } from "@/lib/utils/date-format";
import type { AppointmentWithRelations, BusinessHourRule, TimeRange } from "@/types";

export function BusinessHoursEditor({ businessHours }: { businessHours: BusinessHourRule[] }) {
  const router = useRouter();
  const [rangesByWeekday, setRangesByWeekday] = useState<Record<number, TimeRange[]>>(() => {
    const grouped: Record<number, TimeRange[]> = {};
    for (let w = 0; w < 7; w++) {
      grouped[w] = businessHours
        .filter((b) => b.weekday === w)
        .map((b) => ({ startTime: b.startTime, endTime: b.endTime }));
    }
    return grouped;
  });
  const [savingWeekday, setSavingWeekday] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<AppointmentWithRelations[]>([]);

  function updateRange(weekday: number, index: number, key: keyof TimeRange, value: string) {
    setRangesByWeekday((prev) => ({
      ...prev,
      [weekday]: prev[weekday].map((r, i) => (i === index ? { ...r, [key]: value } : r)),
    }));
  }
  function addRange(weekday: number) {
    setRangesByWeekday((prev) => ({
      ...prev,
      [weekday]: [...prev[weekday], { startTime: "09:00", endTime: "18:00" }],
    }));
  }
  function removeRange(weekday: number, index: number) {
    setRangesByWeekday((prev) => ({
      ...prev,
      [weekday]: prev[weekday].filter((_, i) => i !== index),
    }));
  }

  async function handleSave(weekday: number) {
    setSavingWeekday(weekday);
    const result = await replaceBusinessHoursForWeekdayAction(weekday, rangesByWeekday[weekday]);
    setSavingWeekday(null);
    if (result.warnings.length > 0) {
      setWarnings(result.warnings);
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {warnings.length > 0 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20} />
          <div className="flex-1 text-sm text-amber-900">
            <p className="font-medium">
              Atenção: {warnings.length} agendamento(s) futuro(s) não cabem mais no novo horário.
            </p>
            <ul className="mt-2 space-y-1">
              {warnings.map((a) => (
                <li key={a.id}>
                  {a.customer.fullName} — {formatShortDatePtBR(a.date)} às {a.startTime} ({a.service.name})
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs">
              Nada foi cancelado automaticamente. Entre em contato com os clientes para reagendar ou ajuste o
              horário.
            </p>
          </div>
          <button onClick={() => setWarnings([])} className="text-amber-600 hover:text-amber-800" aria-label="Fechar aviso">
            <X size={16} />
          </button>
        </div>
      ) : null}

      {WEEKDAY_LABELS.map((label, weekday) => (
        <div key={weekday} className="rounded-xl border border-brand-beige p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-medium text-brand-graphite">{label}</p>
            <Button
              variant="secondary"
              className="!px-4 !py-2 text-xs"
              onClick={() => handleSave(weekday)}
              disabled={savingWeekday === weekday}
            >
              {savingWeekday === weekday ? "Salvando..." : "Salvar"}
            </Button>
          </div>
          {rangesByWeekday[weekday].length === 0 ? (
            <p className="mb-2 text-sm text-brand-graphite/50">Fechado</p>
          ) : (
            <div className="mb-2 space-y-2">
              {rangesByWeekday[weekday].map((range, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={range.startTime}
                    onChange={(e) => updateRange(weekday, index, "startTime", e.target.value)}
                    className="min-w-0 flex-1"
                  />
                  <span className="shrink-0 text-brand-graphite/50">até</span>
                  <Input
                    type="time"
                    value={range.endTime}
                    onChange={(e) => updateRange(weekday, index, "endTime", e.target.value)}
                    className="min-w-0 flex-1"
                  />
                  <button
                    onClick={() => removeRange(weekday, index)}
                    className="shrink-0 rounded-lg p-1.5 text-brand-graphite/40 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remover intervalo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => addRange(weekday)}
            className="flex items-center gap-1 text-xs font-medium text-brand-forest hover:underline"
          >
            <Plus size={14} /> Adicionar intervalo
          </button>
        </div>
      ))}
    </div>
  );
}
