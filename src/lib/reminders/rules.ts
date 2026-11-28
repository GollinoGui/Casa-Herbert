import { z } from "zod";

/**
 * Regras de mensagem do WhatsApp por agendamento (settings.reminder_rules, 0022).
 * Nada é enviado sozinho: a regra só diz a partir de quando a mensagem entra na
 * fila do Início. A leitura sempre passa por parseReminderRules().
 */

export type ReminderTiming =
  | { type: "on_booking" }
  /** days 0 = no próprio dia. */
  | { type: "days_before"; days: number; at: string }
  | { type: "hours_before"; hours: number };

export interface ReminderRule {
  id: string;
  enabled: boolean;
  timing: ReminderTiming;
  template: string;
  /** ISO. Só vale para on_booking: confirmado antes disso não entra na fila. */
  since: string;
}

export const REMINDER_PLACEHOLDERS = ["saudacao", "nome", "servico", "data", "horario"] as const;

export const MAX_REMINDER_RULES = 6;
export const MAX_DAYS_BEFORE = 14;
export const MAX_HOURS_BEFORE = 12;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const timingSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("on_booking") }),
  z.object({ type: z.literal("days_before"), days: z.number().int().min(0).max(MAX_DAYS_BEFORE), at: z.string().regex(HHMM) }),
  z.object({ type: z.literal("hours_before"), hours: z.number().int().min(1).max(MAX_HOURS_BEFORE) }),
]);

export const reminderRuleSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  enabled: z.boolean(),
  timing: timingSchema,
  template: z.string().trim().min(1, "Escreva a mensagem.").max(1000),
  since: z.string().datetime({ offset: true }).or(z.string().length(0)),
});

export const reminderRulesInputSchema = z
  .array(reminderRuleSchema)
  .max(MAX_REMINDER_RULES)
  .refine((rules) => new Set(rules.map((r) => r.id)).size === rules.length, "Regras repetidas.");

export const DEFAULT_REMINDER_RULES: ReminderRule[] = [
  {
    id: "ao-marcar",
    enabled: true,
    timing: { type: "on_booking" },
    template:
      "{saudacao}, {nome}! Você tem um horário marcado na Casa Herbert para {data}, às {horario} ({servico}). Se precisar remarcar, é só responder por aqui. 🌿",
    since: "",
  },
  {
    id: "vespera",
    enabled: true,
    timing: { type: "days_before", days: 1, at: "09:00" },
    template:
      "{saudacao}, {nome}! Passando para lembrar do seu horário na Casa Herbert amanhã, {data}, às {horario} ({servico}). Se precisar remarcar, é só responder por aqui. 🌿",
    since: "",
  },
  {
    id: "no-dia",
    enabled: false,
    timing: { type: "days_before", days: 0, at: "08:00" },
    template: "{saudacao}, {nome}! Hoje é dia do seu horário na Casa Herbert, às {horario} ({servico}). Te esperamos! 🌿",
    since: "",
  },
];

/** Regra inválida é descartada; coluna vazia (migration 0022 ainda não aplicada) cai no padrão. */
export function parseReminderRules(raw: unknown): ReminderRule[] {
  if (!Array.isArray(raw)) return DEFAULT_REMINDER_RULES;
  return raw.flatMap((item) => {
    const parsed = reminderRuleSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export function describeTiming(timing: ReminderTiming): string {
  if (timing.type === "on_booking") return "Assim que o horário é confirmado";
  if (timing.type === "hours_before") return `${timing.hours} ${timing.hours === 1 ? "hora" : "horas"} antes do horário`;
  if (timing.days === 0) return `No dia, a partir das ${timing.at}`;
  return `${timing.days} ${timing.days === 1 ? "dia" : "dias"} antes, a partir das ${timing.at}`;
}

/** Nome curto para a fila do Início. */
export function shortTimingLabel(timing: ReminderTiming): string {
  if (timing.type === "on_booking") return "Confirmação";
  if (timing.type === "hours_before") return `${timing.hours}h antes`;
  if (timing.days === 0) return "No dia";
  if (timing.days === 1) return "Véspera";
  return `${timing.days} dias antes`;
}

/** Mesma divisão da saudação do Início: dia das 5h às 11:59, tarde até 17:59 ("HH:mm" do salão). */
export function greetingFor(time: string): string {
  if (time >= "05:00" && time < "12:00") return "Bom dia";
  if (time >= "12:00" && time < "18:00") return "Boa tarde";
  return "Boa noite";
}
