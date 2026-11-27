"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select } from "@/components/ui/Field";
import { checkPackageSessionSlotsAction, schedulePackageSessionsAction } from "@/lib/actions/admin/packages";
import { addDaysToDateStr, formatShortDatePtBR, formatWeekdayPtBR, todayDateStr } from "@/lib/utils/date-format";
import { cn } from "@/lib/utils/cn";
import type { CustomerPackage } from "@/types";

type Problem = "PAST_DATE" | "CLOSED" | "TAKEN" | "EXPIRED";

const PROBLEM_LABEL: Record<Problem, string> = {
  PAST_DATE: "Essa data já passou",
  CLOSED: "O salão está fechado nesse dia",
  TAKEN: "Horário ocupado ou fora do expediente",
  EXPIRED: "Passa da validade do pacote",
};

const FREQUENCIES = [
  { days: 7, label: "Toda semana" },
  { days: 14, label: "A cada 2 semanas" },
  { days: 21, label: "A cada 3 semanas" },
  { days: 28, label: "A cada 4 semanas" },
] as const;

interface Row {
  key: number;
  date: string;
  startTime: string;
}

export function freeSessions(pkg: CustomerPackage) {
  return Math.max(pkg.sessionsTotal - pkg.sessionsUsed - pkg.sessionsScheduled, 0);
}

/**
 * Agenda as sessões do pacote de uma vez: primeira data, horário e frequência geram a
 * lista; cada data é conferida na agenda antes de gravar, e a que não couber pode ser
 * trocada ali mesmo. Grava tudo ou nada.
 */
export function PackageSessionsForm({
  pkg,
  initialDate,
  initialTime,
  count,
  onDone,
  onSkip,
  skipLabel = "Cancelar",
}: {
  pkg: CustomerPackage;
  initialDate?: string;
  initialTime?: string;
  /** Quantas sessões sugerir (padrão: todas as livres). */
  count?: number;
  onDone: () => void;
  onSkip: () => void;
  skipLabel?: string;
}) {
  const free = freeSessions(pkg);
  const [firstDate, setFirstDate] = useState(initialDate ?? todayDateStr());
  const [time, setTime] = useState(initialTime ?? "10:00");
  const [every, setEvery] = useState(7);
  const [howMany, setHowMany] = useState(String(Math.min(count ?? free, free)));
  const [rows, setRows] = useState<Row[]>([]);
  const [problems, setProblems] = useState<(Problem | null)[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const n = Math.min(Math.max(Number(howMany) || 0, 0), free);

  useEffect(() => {
    setRows(
      Array.from({ length: n }, (_, i) => ({ key: i, date: addDaysToDateStr(firstDate, i * every), startTime: time }))
    );
  }, [firstDate, time, every, n]);

  useEffect(() => {
    setProblems(null);
    setError(null);
  }, [rows]);

  const ready = useMemo(() => problems !== null && problems.every((p) => p === null) && rows.length > 0, [problems, rows]);

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function check(list = rows) {
    if (!list.length) return null;
    setChecking(true);
    setError(null);
    const result = await checkPackageSessionSlotsAction(pkg.id, list.map(({ date, startTime }) => ({ date, startTime })));
    setChecking(false);
    if (!result.ok) {
      setError(result.error);
      return null;
    }
    const found = result.problems.map((p, i): Problem | null =>
      p ?? (pkg.expiresOn && list[i].date > pkg.expiresOn ? "EXPIRED" : null)
    );
    setProblems(found);
    return found;
  }

  async function save() {
    setSaving(true);
    setError(null);
    const result = await schedulePackageSessionsAction(pkg.id, rows.map(({ date, startTime }) => ({ date, startTime })));
    setSaving(false);
    if (!result.ok) {
      if (result.error === "SLOT_NO_LONGER_AVAILABLE") {
        setError("Algum horário foi ocupado agora há pouco. Confira as datas de novo.");
        check();
        return;
      }
      setError(result.error);
      return;
    }
    onDone();
  }

  if (free === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-brand-graphite/70">Todas as sessões deste pacote já estão feitas ou agendadas.</p>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onSkip}>
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-brand-graphite/70">
        <strong className="text-brand-graphite">{pkg.name}</strong> · {free} de {pkg.sessionsTotal} sessões para agendar
        {pkg.expiresOn ? ` · vale até ${formatShortDatePtBR(pkg.expiresOn)}` : ""}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="ps-first">Primeira sessão</FieldLabel>
          <Input id="ps-first" type="date" min={todayDateStr()} value={firstDate} onChange={(e) => setFirstDate(e.target.value)} />
          {firstDate ? <p className="mt-1 text-xs capitalize text-brand-graphite/60">{formatWeekdayPtBR(firstDate)}</p> : null}
        </div>
        <div>
          <FieldLabel htmlFor="ps-time">Horário</FieldLabel>
          <Input id="ps-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="ps-every">Frequência</FieldLabel>
          <Select id="ps-every" value={every} onChange={(e) => setEvery(Number(e.target.value))} disabled={n <= 1}>
            {FREQUENCIES.map((f) => (
              <option key={f.days} value={f.days}>
                {f.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="ps-count">Quantas sessões agendar</FieldLabel>
          <Input id="ps-count" type="number" min={1} max={free} value={howMany} onChange={(e) => setHowMany(e.target.value)} />
        </div>
      </div>

      {rows.length ? (
        <div>
          <p className="mb-2 text-sm font-medium text-brand-graphite">Datas</p>
          <ol className="space-y-2">
            {rows.map((row, i) => {
              const problem = problems?.[i] ?? null;
              return (
                <li
                  key={row.key}
                  className={cn(
                    "rounded-xl border p-2.5",
                    problem ? "border-red-300 bg-red-50/60" : problems ? "border-brand-sage/50 bg-brand-sage/10" : "border-brand-beige"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-6 text-center text-xs font-semibold tabular-nums text-brand-graphite/60">{i + 1}</span>
                    <Input
                      type="date"
                      aria-label={`Data da sessão ${i + 1}`}
                      className="!w-auto flex-1"
                      value={row.date}
                      onChange={(e) => updateRow(row.key, { date: e.target.value })}
                    />
                    <Input
                      type="time"
                      aria-label={`Horário da sessão ${i + 1}`}
                      className="!w-28"
                      value={row.startTime}
                      onChange={(e) => updateRow(row.key, { startTime: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                      className="rounded-lg p-2 text-brand-graphite/50 hover:bg-brand-cream hover:text-brand-graphite"
                      aria-label={`Tirar a sessão ${i + 1}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="mt-1 pl-8 text-xs">
                    <span className="capitalize text-brand-graphite/60">{row.date ? formatWeekdayPtBR(row.date) : ""}</span>
                    {problem ? (
                      <span className="ml-2 inline-flex items-center gap-1 font-medium text-red-700">
                        <AlertCircle size={12} aria-hidden="true" /> {PROBLEM_LABEL[problem]}: troque a data ou o horário
                      </span>
                    ) : problems ? (
                      <span className="ml-2 inline-flex items-center gap-1 font-medium text-brand-moss">
                        <CheckCircle2 size={12} aria-hidden="true" /> Livre
                      </span>
                    ) : null}
                  </p>
                </li>
              );
            })}
          </ol>
          {rows.length < free ? (
            <button
              type="button"
              onClick={() => {
                const last = rows[rows.length - 1];
                setRows((current) => [
                  ...current,
                  {
                    key: Math.max(-1, ...current.map((r) => r.key)) + 1,
                    date: last ? addDaysToDateStr(last.date, every) : firstDate,
                    startTime: last?.startTime ?? time,
                  },
                ]);
              }}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-moss hover:underline"
            >
              <Plus size={14} /> Mais uma data
            </button>
          ) : null}
        </div>
      ) : null}

      <p className="text-xs text-brand-graphite/60">
        As sessões entram confirmadas na agenda e no lembrete de véspera. Cada uma só é descontada do pacote quando acontece
        (ou se você decidir que conta, quando a cliente desmarcar ou faltar).
      </p>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onSkip} disabled={saving}>
          {skipLabel}
        </Button>
        {ready ? (
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Agendando..." : `Agendar ${rows.length} ${rows.length === 1 ? "sessão" : "sessões"}`}
          </Button>
        ) : (
          <Button type="button" onClick={() => check()} disabled={checking || !rows.length}>
            {checking ? "Conferindo..." : problems ? "Conferir de novo" : "Conferir datas na agenda"}
          </Button>
        )}
      </div>
    </div>
  );
}

export function PackageSessionsModal({
  open,
  pkg,
  onClose,
  onDone,
  initialDate,
  initialTime,
  count,
}: {
  open: boolean;
  pkg: CustomerPackage | null;
  onClose: () => void;
  onDone: () => void;
  initialDate?: string;
  initialTime?: string;
  count?: number;
}) {
  return (
    <Modal open={open} onClose={onClose} title={count === 1 ? "Marcar reposição" : "Agendar sessões"} widthClassName="max-w-lg">
      {pkg && open ? (
        <PackageSessionsForm
          key={pkg.id}
          pkg={pkg}
          initialDate={initialDate}
          initialTime={initialTime}
          count={count}
          onDone={onDone}
          onSkip={onClose}
        />
      ) : null}
    </Modal>
  );
}
