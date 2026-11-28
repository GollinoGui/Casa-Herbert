"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getDayRouteAction } from "@/lib/actions/admin/appointments";
import { addDaysToDateStr, nowTimeStr, todayDateStr } from "@/lib/utils/date-format";

/** Depois das 18h o roteiro que interessa é o de amanhã. */
function defaultDate() {
  const today = todayDateStr();
  return nowTimeStr() >= "18:00" ? addDaysToDateStr(today, 1) : today;
}

export function DayRouteButton() {
  const [date, setDate] = useState(defaultDate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const [items, { exportDayRoutePdf }] = await Promise.all([
        getDayRouteAction(date),
        import("@/lib/reports/day-route-pdf"),
      ]);
      await exportDayRoutePdf(date, items);
    } catch {
      setError("Não foi possível gerar o roteiro. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="roteiro-data">
          Dia do roteiro
        </label>
        <input
          id="roteiro-data"
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="min-h-11 rounded-xl border border-brand-beige bg-white px-3 text-sm text-brand-graphite"
        />
        <Button variant="secondary" onClick={generate} disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} Roteiro do dia
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
