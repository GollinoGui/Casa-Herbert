"use client";

import { ArrowDown, ArrowUp, Check, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Select } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { SHORTCUT_TARGETS } from "@/components/admin/ShortcutBar";
import { cn } from "@/lib/utils/cn";
import {
  AGENDA_VIEWS,
  MAX_SHORTCUTS,
  SHORTCUTS,
  TEXT_SIZES,
  resetDevicePrefs,
  updateDevicePrefs,
  useDevicePrefs,
  useDevicePrefsReady,
  type AgendaView,
  type ShortcutId,
  type TextSize,
} from "@/lib/panel/device";

/** Salva na hora, neste navegador: não tem botão de salvar nem passa pelo servidor. */
export function DevicePrefsForm() {
  const prefs = useDevicePrefs();
  const ready = useDevicePrefsReady();
  const all = Object.keys(SHORTCUTS) as ShortcutId[];
  const full = prefs.shortcuts.length >= MAX_SHORTCUTS;

  function toggleShortcut(id: ShortcutId) {
    const on = prefs.shortcuts.includes(id);
    if (!on && full) return;
    updateDevicePrefs({ shortcuts: on ? prefs.shortcuts.filter((s) => s !== id) : [...prefs.shortcuts, id] });
  }

  function move(index: number, delta: -1 | 1) {
    const list = [...prefs.shortcuts];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    updateDevicePrefs({ shortcuts: list });
  }

  // Antes da hidratação só existe o padrão: esconder evita mostrar escolhas que não são as deste aparelho.
  if (!ready) return <Card className="h-64 animate-pulse p-6" aria-busy="true" />;

  return (
    <div className="space-y-6">
      <p className="flex items-start gap-2 rounded-2xl border border-brand-beige bg-white p-4 text-sm text-brand-graphite/70">
        <Smartphone size={18} className="mt-0.5 shrink-0 text-brand-moss" aria-hidden="true" />
        <span>
          Estas escolhas valem só para <strong>este aparelho e navegador</strong> e são salvas na hora. Em outro celular ou
          computador, ou depois de limpar os dados do navegador, voltam ao padrão.
        </span>
      </p>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="mb-1 font-serif text-xl text-brand-forest">Barra de atalhos</h2>
          <p className="mb-3 text-sm text-brand-graphite/60">Fica embaixo da tela no celular e no tablet, ao alcance do polegar.</p>
          <Switch
            label="Mostrar a barra de atalhos"
            checked={prefs.shortcutBar}
            onChange={(v) => updateDevicePrefs({ shortcutBar: v })}
          />

          {prefs.shortcutBar ? (
            <>
              <p className="mb-2 mt-4 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-graphite/60">
                Na barra, da esquerda para a direita ({prefs.shortcuts.length} de {MAX_SHORTCUTS})
              </p>
              {prefs.shortcuts.length === 0 ? (
                <p className="px-3 text-sm text-brand-graphite/60">Nenhum atalho escolhido: a barra fica escondida.</p>
              ) : (
                <ol className="space-y-2">
                  {prefs.shortcuts.map((id, i) => {
                    const Icon = SHORTCUT_TARGETS[id].icon;
                    return (
                      <li key={id} className="flex items-center gap-2 rounded-xl border border-brand-beige bg-white py-1.5 pl-3 pr-1.5">
                        <Icon size={18} strokeWidth={1.75} className="shrink-0 text-brand-moss" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-sm text-brand-graphite">{SHORTCUTS[id]}</span>
                        <button
                          type="button"
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                          aria-label={`Subir ${SHORTCUTS[id]}`}
                          className="flex h-11 w-11 items-center justify-center rounded-lg text-brand-moss transition hover:bg-brand-sage/15 active:scale-95 disabled:opacity-25"
                        >
                          <ArrowUp size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(i, 1)}
                          disabled={i === prefs.shortcuts.length - 1}
                          aria-label={`Descer ${SHORTCUTS[id]}`}
                          className="flex h-11 w-11 items-center justify-center rounded-lg text-brand-moss transition hover:bg-brand-sage/15 active:scale-95 disabled:opacity-25"
                        >
                          <ArrowDown size={18} />
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}

              <p className="mb-2 mt-5 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-graphite/60">
                Toque para pôr ou tirar
              </p>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {all.map((id) => {
                  const on = prefs.shortcuts.includes(id);
                  const Icon = SHORTCUT_TARGETS[id].icon;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleShortcut(id)}
                        disabled={!on && full}
                        className={cn(
                          "flex min-h-12 w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
                          on ? "border-transparent bg-brand-forest text-brand-ink" : "border-brand-beige bg-white text-brand-graphite hover:bg-brand-cream"
                        )}
                      >
                        {on ? <Check size={16} className="shrink-0" aria-hidden="true" /> : <Icon size={16} className="shrink-0 text-brand-moss" aria-hidden="true" />}
                        <span className="leading-tight">{SHORTCUTS[id]}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {full ? <p className="mt-2 px-3 text-xs text-brand-graphite/50">Cabem {MAX_SHORTCUTS}. Tire um para pôr outro.</p> : null}
            </>
          ) : null}
        </Card>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="mb-1 font-serif text-xl text-brand-forest">Tamanho do texto</h2>
            <p className="mb-4 text-sm text-brand-graphite/60">Aumenta o texto, os botões e os espaços juntos.</p>
            <div role="radiogroup" aria-label="Tamanho do texto" className="grid grid-cols-3 gap-2 rounded-2xl bg-brand-cream p-1.5">
              {(Object.keys(TEXT_SIZES) as TextSize[]).map((size, i) => {
                const on = prefs.textSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => updateDevicePrefs({ textSize: size })}
                    className={cn(
                      "flex min-h-14 flex-col items-center justify-center rounded-xl px-2 py-2 transition active:scale-[0.97]",
                      on ? "bg-white text-brand-forest shadow-softer" : "text-brand-graphite/70 hover:text-brand-graphite"
                    )}
                  >
                    <span className="font-serif leading-none" style={{ fontSize: `${1 + i * 0.25}rem` }} aria-hidden="true">
                      Aa
                    </span>
                    <span className="mt-1 text-xs font-medium">{TEXT_SIZES[size]}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="mb-3 font-serif text-xl text-brand-forest">Privacidade e agenda</h2>
            <Switch
              label="Esconder valores em dinheiro"
              description="Saldo e totais ficam borrados. Também dá para trocar pelo olho no topo da tela."
              checked={prefs.hideMoney}
              onChange={(v) => updateDevicePrefs({ hideMoney: v })}
            />
            <div className="mt-4 px-3">
              <FieldLabel htmlFor="dev-agenda">A agenda abre em</FieldLabel>
              <Select
                id="dev-agenda"
                value={prefs.agendaView}
                onChange={(e) => updateDevicePrefs({ agendaView: e.target.value as AgendaView })}
              >
                {(Object.keys(AGENDA_VIEWS) as AgendaView[]).map((v) => (
                  <option key={v} value={v}>
                    {AGENDA_VIEWS[v]}
                  </option>
                ))}
              </Select>
            </div>
          </Card>

          <Button variant="ghost" onClick={resetDevicePrefs}>
            Voltar este aparelho ao padrão
          </Button>
        </div>
      </div>
    </div>
  );
}
