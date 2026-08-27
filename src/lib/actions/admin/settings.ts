"use server";

import { revalidatePath } from "next/cache";
import { getSettings, updateSettings } from "@/lib/data/settings";
import type { Settings } from "@/types";

export async function getSettingsAction(): Promise<Settings> {
  return getSettings();
}

export async function updateSettingsAction(partial: Partial<Settings>) {
  const settings = await updateSettings(partial);
  revalidatePath("/admin/configuracoes");
  revalidatePath("/");
  return settings;
}
