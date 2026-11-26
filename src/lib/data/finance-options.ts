import { cache } from "react";
import type { PaymentMethod } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";
import { parsePanelPreferences } from "@/lib/panel/preferences";
import {
  DEFAULT_FINANCE_OPTIONS,
  parsePaymentMethodOptions,
  slugifyCategory,
  type FinanceOptions,
  type PayableCategoryOption,
  type PaymentMethodOption,
} from "@/lib/finance/options";

/**
 * Lida uma vez por requisição (layout do painel + actions). Se a leitura falhar
 * (ex.: migration 0013 ainda não aplicada), o painel segue com as listas padrão
 * em vez de cair inteiro — o erro vai para o log. Salvar continua lançando.
 */
export const getFinanceOptions = cache(async (): Promise<FinanceOptions> => {
  const supabase = getSupabase();
  const [settings, categories] = await Promise.all([
    supabase.from("settings").select("payment_method_options, panel_preferences").eq("id", 1).single(),
    supabase.from("payable_categories").select("slug, label, active").order("sort_order").order("label"),
  ]);
  if (settings.error || categories.error) {
    console.error("[finance-options] usando listas padrão:", settings.error?.message ?? categories.error?.message);
    return DEFAULT_FINANCE_OPTIONS;
  }
  return {
    paymentMethods: parsePaymentMethodOptions(settings.data.payment_method_options),
    categories: categories.data as PayableCategoryOption[],
    defaultMethod: parsePanelPreferences(settings.data.panel_preferences).defaultPaymentMethod,
  };
});

export async function isPaymentMethodEnabled(method: PaymentMethod): Promise<boolean> {
  const { paymentMethods } = await getFinanceOptions();
  return paymentMethods.some((m) => m.value === method && m.enabled);
}

export async function isKnownPayableCategory(slug: string): Promise<boolean> {
  const { categories } = await getFinanceOptions();
  return categories.some((c) => c.slug === slug);
}

export async function savePaymentMethodOptions(list: PaymentMethodOption[]): Promise<void> {
  const value = Object.fromEntries(list.map((m) => [m.value, { label: m.label.trim(), enabled: m.enabled }]));
  unwrap(await getSupabase().from("settings").update({ payment_method_options: value }).eq("id", 1));
}

/** Quantas contas (avulsas e fixas) usam cada categoria — categoria em uso não pode ser apagada. */
// Contagem exata por slug: um select das linhas pararia no limite de 1000 do PostgREST.
async function countCategoryUse(slug: string): Promise<number> {
  const supabase = getSupabase();
  const [payables, bills] = await Promise.all([
    supabase.from("payables").select("id", { count: "exact", head: true }).eq("category", slug),
    supabase.from("recurring_bills").select("id", { count: "exact", head: true }).eq("category", slug),
  ]);
  if (payables.error) throw new Error(payables.error.message);
  if (bills.error) throw new Error(bills.error.message);
  return (payables.count ?? 0) + (bills.count ?? 0);
}

export async function getPayableCategoryUsage(slugs: string[]): Promise<Record<string, number>> {
  const counts = await Promise.all(slugs.map(countCategoryUse));
  return Object.fromEntries(slugs.map((s, i) => [s, counts[i]]));
}

/**
 * Grava a lista inteira na ordem da tela, num único upsert (atômico). Linha sem
 * slug é categoria nova: o slug sai do nome e nunca reaproveita um existente.
 */
export async function savePayableCategories(list: { slug: string; label: string; active: boolean }[]): Promise<void> {
  const supabase = getSupabase();
  const taken = new Set(unwrap(await supabase.from("payable_categories").select("slug")).map((r) => r.slug as string));
  const rows = list.map((c, i) => {
    let slug = c.slug;
    if (!slug) {
      const base = slugifyCategory(c.label);
      slug = base;
      for (let n = 2; taken.has(slug); n++) slug = `${base}_${n}`;
      taken.add(slug);
    }
    return { slug, label: c.label.trim(), active: c.active, sort_order: (i + 1) * 10 };
  });
  unwrap(await supabase.from("payable_categories").upsert(rows, { onConflict: "slug" }));
}

export async function deletePayableCategory(slug: string): Promise<{ ok: boolean; error?: string }> {
  if ((await countCategoryUse(slug)) > 0) {
    return { ok: false, error: "Esta categoria já foi usada em contas. Desative em vez de apagar — o histórico continua com o nome." };
  }
  unwrap(await getSupabase().from("payable_categories").delete().eq("slug", slug));
  return { ok: true };
}
