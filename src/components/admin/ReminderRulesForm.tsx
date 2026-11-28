"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea, FieldLabel } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { saveReminderRulesAction } from "@/lib/actions/admin/reminders";
import { buildReminderMessage } from "@/lib/booking/whatsapp";
import {
  MAX_DAYS_BEFORE,
  MAX_HOURS_BEFORE,
  MAX_REMINDER_RULES,
  REMINDER_PLACEHOLDERS,
  describeTiming,
  type ReminderRule,
  type ReminderTiming,
} from "@/lib/reminders/rules";
import { addDaysToDateStr, todayDateStr } from "@/lib/utils/date-format";

type TimingChoice = "on_booking" | "days_before" | "same_day" | "hours_before";

const CHOICES: { value: TimingChoice; label: string }[] = [
  { value: "on_booking", label: "Assim que o horário é confirmado" },
  { value: "days_before", label: "Alguns dias antes" },
  { value: "same_day", label: "No dia do horário" },
  { value: "hours_before", label: "Algumas horas antes" },
];

const choiceOf = (t: ReminderTiming): TimingChoice =>
  t.type === "days_before" ? (t.days === 0 ? "same_day" : "days_before") : t.type;

function timingFor(choice: TimingChoice, current: ReminderTiming): ReminderTiming {
  const at = current.type === "days_before" ? current.at : "09:00";
  if (choice === "on_booking") return { type: "on_booking" };
  if (choice === "same_day") return { type: "days_before", days: 0, at: current.type === "days_before" && current.days === 0 ? at : "08:00" };
  if (choice === "days_before") return { type: "days_before", days: current.type === "days_before" && current.days > 0 ? current.days : 1, at };
  return { type: "hours_before", hours: current.type === "hours_before" ? current.hours : 2 };
}

const clampInt = (value: string, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(value) || min)));

const SAMPLE = {
  appointment: { date: addDaysToDateStr(todayDateStr(), 1), startTime: "14:30" },
  customer: { fullName: "Maria Souza" },
  service: { name: "Terapia capilar" },
};

export function ReminderRulesForm({ rules: initial }: { rules: ReminderRule[] }) {
  const router = useRouter();
  const [rules, setRules] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const update = (id: string, patch: Partial<ReminderRule>) =>
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  function addRule() {
    const id = `regra-${Date.now().toString(36)}`;
    setRules((prev) => [
      ...prev,
      {
        id,
        enabled: true,
        timing: { type: "days_before", days: 0, at: "08:00" },
        template: "{saudacao}, {nome}! Passando para lembrar do seu horário na Casa Herbert, {data}, às {horario}. 🌿",
        since: "",
      },
    ]);
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    const result = await saveReminderRulesAction(rules);
    setSaving(false);
    if (!result.ok) {
      setStatus({ ok: false, text: result.error });
      return;
    }
    setStatus({ ok: true, text: "Regras salvas." });
    router.refresh();
    setTimeout(() => setStatus(null), 3000);
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-1 font-serif text-xl text-brand-forest">Confirmações e lembretes de horário</h2>
      <p className="mb-5 text-sm text-brand-graphite/60">
        Na hora de cada mensagem, ela aparece em <strong>Mensagens para enviar</strong>, no Início (e no sino). Um clique abre o
        WhatsApp da cliente com o texto pronto, e é só apertar enviar. Se uma mensagem passar sem envio e chegar a hora da
        seguinte, fica só a mais recente. Use{" "}
        {REMINDER_PLACEHOLDERS.map((p, i) => (
          <span key={p}>
            <code className="rounded bg-brand-cream px-1">{`{${p}}`}</code>
            {i < REMINDER_PLACEHOLDERS.length - 2 ? ", " : i === REMINDER_PLACEHOLDERS.length - 2 ? " e " : ""}
          </span>
        ))}
        . <code className="rounded bg-brand-cream px-1">{"{saudacao}"}</code> vira “Bom dia”, “Boa tarde” ou “Boa noite” conforme a
        hora do envio.
      </p>

      <ul className="space-y-4">
        {rules.map((rule) => {
          const choice = choiceOf(rule.timing);
          const t = rule.timing;
          return (
            <li key={rule.id} className="rounded-2xl border border-brand-beige p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <Switch
                    checked={rule.enabled}
                    onChange={(enabled) => update(rule.id, { enabled })}
                    label={describeTiming(t)}
                    description={rule.enabled ? "Ligada" : "Desligada: não entra na fila"}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setRules((prev) => prev.filter((r) => r.id !== rule.id))}
                  aria-label={`Apagar a mensagem “${describeTiming(t)}”`}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-brand-graphite/60 transition hover:bg-brand-cream hover:text-brand-graphite"
                >
                  <Trash2 size={17} aria-hidden="true" />
                </button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div>
                  <FieldLabel htmlFor={`${rule.id}-when`}>Quando</FieldLabel>
                  <Select
                    id={`${rule.id}-when`}
                    value={choice}
                    onChange={(e) => update(rule.id, { timing: timingFor(e.target.value as TimingChoice, t) })}
                  >
                    {CHOICES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </div>
                {t.type === "days_before" && t.days > 0 ? (
                  <div className="sm:w-28">
                    <FieldLabel htmlFor={`${rule.id}-days`}>Dias antes</FieldLabel>
                    <Input
                      id={`${rule.id}-days`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_DAYS_BEFORE}
                      value={t.days}
                      onChange={(e) => update(rule.id, { timing: { ...t, days: clampInt(e.target.value, 1, MAX_DAYS_BEFORE) } })}
                    />
                  </div>
                ) : null}
                {t.type === "days_before" ? (
                  <div className="sm:w-32">
                    <FieldLabel htmlFor={`${rule.id}-at`}>A partir das</FieldLabel>
                    <Input
                      id={`${rule.id}-at`}
                      type="time"
                      value={t.at}
                      onChange={(e) => e.target.value && update(rule.id, { timing: { ...t, at: e.target.value } })}
                    />
                  </div>
                ) : null}
                {t.type === "hours_before" ? (
                  <div className="sm:w-28">
                    <FieldLabel htmlFor={`${rule.id}-hours`}>Horas antes</FieldLabel>
                    <Input
                      id={`${rule.id}-hours`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_HOURS_BEFORE}
                      value={t.hours}
                      onChange={(e) => update(rule.id, { timing: { ...t, hours: clampInt(e.target.value, 1, MAX_HOURS_BEFORE) } })}
                    />
                  </div>
                ) : null}
              </div>
              {t.type === "on_booking" ? (
                <p className="mt-2 text-xs text-brand-graphite/50">
                  Vale para os horários confirmados depois que esta mensagem for ligada. Sessões de pacote ficam de fora (são
                  marcadas várias de uma vez). Mandar a confirmação pelo detalhe do agendamento também tira ela da fila.
                </p>
              ) : null}

              <div className="mt-3">
                <FieldLabel htmlFor={`${rule.id}-text`}>Mensagem</FieldLabel>
                <Textarea
                  id={`${rule.id}-text`}
                  rows={4}
                  value={rule.template}
                  onChange={(e) => update(rule.id, { template: e.target.value })}
                />
                {rule.template.trim() ? (
                  <p className="mt-2 whitespace-pre-line rounded-xl bg-brand-cream px-3 py-2 text-xs text-brand-graphite/70">
                    <span className="font-medium text-brand-graphite">Exemplo: </span>
                    {buildReminderMessage(rule.template, SAMPLE.appointment, SAMPLE.customer, SAMPLE.service, "10:00")}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {rules.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-brand-beige p-4 text-sm text-brand-graphite/60">
          Nenhuma mensagem configurada: a fila do Início fica vazia.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar regras"}
        </Button>
        {rules.length < MAX_REMINDER_RULES ? (
          <Button variant="secondary" onClick={addRule} disabled={saving}>
            <Plus size={16} aria-hidden="true" /> Adicionar mensagem
          </Button>
        ) : null}
        {status ? (
          <span role="status" className={status.ok ? "text-sm text-brand-moss" : "text-sm text-brand-forest"}>
            {status.text}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
