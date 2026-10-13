"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import { getSettings, updateSettings } from "@/lib/data/settings";
import { announcementFormSchema } from "@/lib/booking/validators";
import type { Settings } from "@/types";

export async function getSettingsAction(): Promise<Settings> {
  await requireAdmin();
  return getSettings();
}

export async function updateSettingsAction(partial: Partial<Settings>) {
  await requireAdmin();
  const settings = await updateSettings(partial);
  revalidatePath("/admin/configuracoes");
  revalidatePath("/");
  return settings;
}

/** A faixa aparece em todas as páginas do site, por isso revalida o layout inteiro. */
export async function updateAnnouncementAction(input: {
  announcementText: string;
  announcementLink: string;
  announcementUntil: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const parsed = announcementFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  await updateSettings(parsed.data);
  revalidatePath("/", "layout");
  return { ok: true };
}
