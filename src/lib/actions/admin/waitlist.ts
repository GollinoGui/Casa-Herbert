"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { addToWaitlist, getWaitlistOpenings, setWaitlistStatus } from "@/lib/data/waitlist";
import { todayDateStr } from "@/lib/utils/date-format";

const entrySchema = z.object({
  customerId: z.string().uuid("Escolha a cliente."),
  serviceId: z.string().uuid().nullable(),
  desiredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha o dia.")
    .refine((d) => d >= todayDateStr(), "Escolha hoje ou um dia à frente."),
  period: z.enum(["any", "morning", "afternoon"]),
  notes: z.string().trim().max(500, "Observação muito longa.").nullable(),
});

function revalidateWaitlist() {
  revalidatePath("/admin/lista-de-espera");
  revalidatePath("/admin");
}

export async function addToWaitlistAction(input: z.infer<typeof entrySchema>) {
  await requireAdmin();
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  await addToWaitlist({ ...parsed.data, notes: parsed.data.notes || null });
  revalidateWaitlist();
  return { ok: true as const };
}

export async function setWaitlistStatusAction(id: string, status: "scheduled" | "cancelled") {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success || !["scheduled", "cancelled"].includes(status)) {
    return { ok: false as const, error: "Pedido inválido." };
  }
  await setWaitlistStatus(id, status);
  revalidateWaitlist();
  return { ok: true as const };
}

export async function getWaitlistOpeningsAction() {
  await requireAdmin();
  return getWaitlistOpenings();
}
