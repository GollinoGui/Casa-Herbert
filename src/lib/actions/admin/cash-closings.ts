"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { closeCashDrawer, getCashDrawerPreview } from "@/lib/data/cash-closings";

const closeSchema = z.object({
  countedCents: z.number().int().min(0, "Informe quanto tem na gaveta."),
  withdrawnCents: z.number().int().min(0),
  openingCents: z.number().int().min(0).optional(),
  postDifference: z.boolean(),
  notes: z.string().trim().max(500).optional(),
});

export async function getCashDrawerPreviewAction(openingCents = 0) {
  await requireAdmin();
  return getCashDrawerPreview(Number.isInteger(openingCents) && openingCents >= 0 ? openingCents : 0);
}

export async function closeCashDrawerAction(input: z.infer<typeof closeSchema>) {
  await requireAdmin();
  const parsed = closeSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const result = await closeCashDrawer(parsed.data);
  if (result.ok) {
    revalidatePath("/admin");
    revalidatePath("/admin/financeiro");
    revalidatePath("/admin/relatorios");
  }
  return result;
}
