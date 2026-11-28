"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff } from "@/lib/auth/require-admin";
import { getReminderRules, markAppointmentMessages, saveReminderRules } from "@/lib/data/reminders";
import { reminderRulesInputSchema, type ReminderRule } from "@/lib/reminders/rules";

type ActionResult = { ok: true } | { ok: false; error: string };

const markSchema = z.object({
  appointmentId: z.string().uuid(),
  ruleId: z.string().regex(/^[a-z0-9-]{1,40}$/),
  sent: z.boolean(),
});

/** Abrir o WhatsApp pela fila marca a mensagem como aberta; desmarcar devolve à fila. */
export async function markReminderSentAction(appointmentId: string, ruleId: string, sent: boolean): Promise<void> {
  await requireStaff();
  const input = markSchema.parse({ appointmentId, ruleId, sent });
  await markAppointmentMessages(input.appointmentId, [input.ruleId], input.sent);
  revalidatePath("/admin");
}

/** A confirmação mandada pelo detalhe do agendamento conta como a mensagem "ao marcar" da fila. */
export async function markBookingConfirmationSentAction(appointmentId: string): Promise<void> {
  await requireStaff();
  const id = z.string().uuid().parse(appointmentId);
  const ruleIds = (await getReminderRules()).filter((r) => r.timing.type === "on_booking").map((r) => r.id);
  await markAppointmentMessages(id, ruleIds, true);
  revalidatePath("/admin");
}

export async function saveReminderRulesAction(input: ReminderRule[]): Promise<ActionResult> {
  await requireAdmin();
  const parsed = reminderRulesInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Regras inválidas." };

  // "since" é do servidor: a confirmação só vale para o que for confirmado depois de a
  // regra ser ligada, senão todo agendamento futuro já existente cairia na fila de uma vez.
  const previous = new Map((await getReminderRules()).map((r) => [r.id, r]));
  const now = new Date().toISOString();
  const rules = parsed.data.map((rule) => {
    const before = previous.get(rule.id);
    const keep = before && before.enabled && before.timing.type === rule.timing.type && before.since;
    return { ...rule, since: keep ? before.since : now };
  });

  await saveReminderRules(rules);
  revalidatePath("/admin");
  revalidatePath("/admin/configuracoes");
  return { ok: true };
}
