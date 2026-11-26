"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldError, FieldLabel, Select } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { useFinanceOptions } from "@/components/admin/FinanceOptionsProvider";
import { savePanelPreferencesAction } from "@/lib/actions/admin/settings";
import type { PaymentMethod } from "@/types";
import {
  AGENDA_SLOT_MINUTES,
  DASHBOARD_BLOCKS,
  DASHBOARD_GROUPS,
  DASHBOARD_SECTIONS,
  DEFAULT_PANEL_PREFERENCES,
  LAPSED_DAYS,
  PAYABLE_DUE_DAYS,
  RANKING_SIZES,
  REPORT_BLOCKS,
  REPORT_GROUPS,
  REPORT_PERIODS,
  type PanelPreferences,
  type ReportPeriod,
} from "@/lib/panel/preferences";

const HOURS = Array.from({ length: 25 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

export function PanelPreferencesForm({ preferences }: { preferences: PanelPreferences }) {
  const router = useRouter();
  const fin = useFinanceOptions();
  const [prefs, setPrefs] = useState(preferences);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Depois de salvar, a página recarrega as preferências: alinha o formulário sem remontar (e sem perder o "salvo").
  const synced = JSON.stringify(preferences);
  useEffect(() => {
    setPrefs(preferences);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synced]);

  const dirty = JSON.stringify(prefs) !== JSON.stringify(preferences);
  const rankingOptions = RANKING_SIZES.includes(prefs.rankingSize as (typeof RANKING_SIZES)[number])
    ? RANKING_SIZES
    : [...RANKING_SIZES, prefs.rankingSize].sort((a, b) => a - b);

  async function save(next: PanelPreferences) {
    setSaving(true);
    setError(null);
    const result = await savePanelPreferencesAction(next);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 3000);
  }

  function moveSection(index: number, delta: -1 | 1) {
    setPrefs((p) => {
      const order = [...p.dashboardOrder];
      const target = index + delta;
      if (target < 0 || target >= order.length) return p;
      [order[index], order[target]] = [order[target], order[index]];
      return { ...p, dashboardOrder: order };
    });
  }

  const customHours = prefs.agendaStart !== "";

  function resetToDefault() {
    setPrefs(DEFAULT_PANEL_PREFERENCES);
    void save(DEFAULT_PANEL_PREFERENCES);
  }

  const actions = (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={() => save(prefs)} disabled={saving || !dirty}>
        {saving ? "Salvando..." : "Salvar preferências"}
      </Button>
      <Button variant="ghost" onClick={resetToDefault} disabled={saving}>
        Mostrar tudo de novo
      </Button>
      {saved ? (
        <span role="status" className="text-sm text-brand-moss">
          Preferências salvas.
        </span>
      ) : dirty ? (
        <span className="text-sm text-brand-graphite/60">Há mudanças não salvas.</span>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-xl text-brand-forest">Página Início</h2>
            <Link href="/admin" className="text-xs font-medium text-brand-moss hover:underline">
              Ver o Início
            </Link>
          </div>
          <div className="space-y-5">
            {DASHBOARD_GROUPS.map((group) => (
              <fieldset key={group.title}>
                <legend className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-graphite/60">
                  {group.title}
                </legend>
                <div className="divide-y divide-brand-beige/60">
                  {group.keys.map((key) => (
                    <Switch
                      key={key}
                      label={DASHBOARD_BLOCKS[key]}
                      checked={prefs.dashboard[key]}
                      onChange={(v) => setPrefs((p) => ({ ...p, dashboard: { ...p.dashboard, [key]: v } }))}
                    />
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="mt-5 grid gap-4 border-t border-brand-beige px-3 pt-5 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="pref-due">Contas a vencer</FieldLabel>
              <Select
                id="pref-due"
                value={prefs.payableDueDays}
                onChange={(e) => setPrefs((p) => ({ ...p, payableDueDays: Number(e.target.value) }))}
              >
                {PAYABLE_DUE_DAYS.map((n) => (
                  <option key={n} value={n}>
                    Nos próximos {n} dias
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="pref-lapsed">Cliente que não volta há</FieldLabel>
              <Select
                id="pref-lapsed"
                value={prefs.lapsedDays}
                onChange={(e) => setPrefs((p) => ({ ...p, lapsedDays: Number(e.target.value) }))}
              >
                {LAPSED_DAYS.map((n) => (
                  <option key={n} value={n}>
                    {n} dias ou mais
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-brand-graphite/50">Conta desde o último atendimento concluído.</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-1 font-serif text-xl text-brand-forest">Ordem do Início</h2>
          <p className="mb-4 text-sm text-brand-graphite/60">Use as setas para subir ou descer cada parte da página.</p>
          <ol className="space-y-2">
            {prefs.dashboardOrder.map((key, i) => (
              <li key={key} className="flex items-center gap-2 rounded-xl border border-brand-beige bg-white py-1.5 pl-3 pr-1.5">
                <span className="w-5 shrink-0 text-xs font-semibold tabular-nums text-brand-graphite/40">{i + 1}</span>
                <span className="min-w-0 flex-1 text-sm text-brand-graphite">{DASHBOARD_SECTIONS[key]}</span>
                <button
                  type="button"
                  onClick={() => moveSection(i, -1)}
                  disabled={i === 0}
                  aria-label={`Subir ${DASHBOARD_SECTIONS[key]}`}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-brand-moss transition hover:bg-brand-sage/15 active:scale-95 disabled:opacity-25"
                >
                  <ArrowUp size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(i, 1)}
                  disabled={i === prefs.dashboardOrder.length - 1}
                  aria-label={`Descer ${DASHBOARD_SECTIONS[key]}`}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-brand-moss transition hover:bg-brand-sage/15 active:scale-95 disabled:opacity-25"
                >
                  <ArrowDown size={18} />
                </button>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 font-serif text-xl text-brand-forest">Agenda e vendas</h2>
          <div className="grid gap-4 px-0 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="pref-slot">Linhas da agenda a cada</FieldLabel>
              <Select
                id="pref-slot"
                value={prefs.agendaSlotMinutes}
                onChange={(e) => setPrefs((p) => ({ ...p, agendaSlotMinutes: Number(e.target.value) }))}
              >
                {AGENDA_SLOT_MINUTES.map((n) => (
                  <option key={n} value={n}>
                    {n === 60 ? "1 hora" : `${n} minutos`}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="pref-method">Forma de pagamento já marcada</FieldLabel>
              <Select
                id="pref-method"
                value={prefs.defaultPaymentMethod}
                onChange={(e) => setPrefs((p) => ({ ...p, defaultPaymentMethod: e.target.value as PaymentMethod }))}
              >
                {fin.methodChoices(prefs.defaultPaymentMethod).map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                    {m.enabled ? "" : " (desligada)"}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-brand-graphite/50">Em vendas, compras e pagamentos. Dá para trocar em cada um.</p>
            </div>
            <div className="sm:col-span-2">
              <Switch
                label="Escolher as horas que a agenda mostra"
                description="Desligado: vai da abertura ao fechamento do horário de funcionamento."
                checked={customHours}
                onChange={(v) =>
                  setPrefs((p) => ({ ...p, agendaStart: v ? "08:00" : "", agendaEnd: v ? "20:00" : "" }))
                }
              />
            </div>
            {customHours ? (
              <>
                <div>
                  <FieldLabel htmlFor="pref-start">Começa às</FieldLabel>
                  <Select id="pref-start" value={prefs.agendaStart} onChange={(e) => setPrefs((p) => ({ ...p, agendaStart: e.target.value }))}>
                    {HOURS.slice(0, -1).map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor="pref-end">Termina às</FieldLabel>
                  <Select id="pref-end" value={prefs.agendaEnd} onChange={(e) => setPrefs((p) => ({ ...p, agendaEnd: e.target.value }))}>
                    {HOURS.slice(1).map((h) => (
                      <option key={h} value={h} disabled={h <= prefs.agendaStart}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </div>
              </>
            ) : null}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-xl text-brand-forest">Relatórios</h2>
            <Link href="/admin/relatorios" className="text-xs font-medium text-brand-moss hover:underline">
              Ver os Relatórios
            </Link>
          </div>

          <div className="mb-5 grid gap-4 px-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="pref-period">Período que abre primeiro</FieldLabel>
              <Select
                id="pref-period"
                value={prefs.reportPeriod}
                onChange={(e) => setPrefs((p) => ({ ...p, reportPeriod: e.target.value as ReportPeriod }))}
              >
                {(Object.keys(REPORT_PERIODS) as ReportPeriod[]).map((k) => (
                  <option key={k} value={k}>
                    {REPORT_PERIODS[k]}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-brand-graphite/50">Dá para trocar no filtro a qualquer momento.</p>
            </div>
            <div>
              <FieldLabel htmlFor="pref-ranking">Itens nos rankings</FieldLabel>
              <Select
                id="pref-ranking"
                value={prefs.rankingSize}
                onChange={(e) => setPrefs((p) => ({ ...p, rankingSize: Number(e.target.value) }))}
              >
                {rankingOptions.map((n) => (
                  <option key={n} value={n}>
                    Os {n} primeiros
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-brand-graphite/50">Serviços, produtos e formas de pagamento.</p>
            </div>
          </div>

          <div className="space-y-5">
            {REPORT_GROUPS.map((group) => (
              <fieldset key={group.title}>
                <legend className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-graphite/60">
                  {group.title}
                </legend>
                <div className="divide-y divide-brand-beige/60">
                  {group.keys.map((key) => (
                    <Switch
                      key={key}
                      label={REPORT_BLOCKS[key]}
                      checked={prefs.reports[key]}
                      onChange={(v) => setPrefs((p) => ({ ...p, reports: { ...p.reports, [key]: v } }))}
                    />
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </Card>
      </div>

      <div className="sticky bottom-[var(--barra-atalhos)] z-10 -mx-4 border-t border-brand-beige bg-brand-cream/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        {actions}
        <FieldError>{error}</FieldError>
      </div>
    </div>
  );
}
