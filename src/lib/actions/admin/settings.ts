"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import { getSettings, updateSettings } from "@/lib/data/settings";
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
