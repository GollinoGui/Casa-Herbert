"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import { getSettings, savePanelPreferences, updateSettings } from "@/lib/data/settings";
import { announcementFormSchema } from "@/lib/booking/validators";
import type { Settings } from "@/types";
import { panelPreferencesInputSchema, type PanelPreferences } from "@/lib/panel/preferences";
import {
  deletePayableCategory,
  savePayableCategories,
  savePaymentMethodOptions,
} from "@/lib/data/finance-options";
import {
  payableCategoriesInputSchema,
  paymentMethodsInputSchema,
  type PaymentMethodOption,
} from "@/lib/finance/options";

export async function getSettingsAction(): Promise<Settings> {
  await requireAdmin();
  return getSettings();
}

export async function updateSettingsAction(partial: Partial<Settings>) {
  await requireAdmin();
  const settings = await updateSettings(partial);
  revalidatePath("/admin");
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

type ActionResult = { ok: true } | { ok: false; error: string };

function firstIssue(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

export async function savePanelPreferencesAction(input: PanelPreferences): Promise<ActionResult> {
  await requireAdmin();
  const parsed = panelPreferencesInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  await savePanelPreferences(parsed.data);
  // A forma de pagamento padrão chega aos modais pelo layout do painel.
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Rótulos e formas aceitas aparecem em todo o painel: revalida o layout do admin. */
export async function savePaymentMethodsAction(input: PaymentMethodOption[]): Promise<ActionResult> {
  await requireAdmin();
  const parsed = paymentMethodsInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  await savePaymentMethodOptions(parsed.data);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function savePayableCategoriesAction(
  input: { slug: string; label: string; active: boolean }[]
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = payableCategoriesInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  await savePayableCategories(parsed.data);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function deletePayableCategoryAction(slug: string): Promise<ActionResult> {
  await requireAdmin();
  const result = await deletePayableCategory(slug);
  if (!result.ok) return { ok: false, error: result.error ?? "Não foi possível apagar." };
  revalidatePath("/admin", "layout");
  return { ok: true };
}
