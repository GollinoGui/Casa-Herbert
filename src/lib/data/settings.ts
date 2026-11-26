import type { Settings } from "@/types";
import { parsePanelPreferences, type PanelPreferences } from "@/lib/panel/preferences";
import { getSupabase, unwrap } from "@/lib/supabase/server";
import { fromSettings, toSettings } from "@/lib/supabase/mappers";

export async function getSettings(): Promise<Settings> {
  const row = unwrap(await getSupabase().from("settings").select("*").eq("id", 1).single());
  return toSettings(row);
}

export async function updateSettings(partial: Partial<Settings>): Promise<Settings> {
  const row = unwrap(
    await getSupabase().from("settings").update(fromSettings(partial)).eq("id", 1).select("*").single()
  );
  return toSettings(row);
}

/** Se a leitura falhar (ex.: migration 0013 ainda não aplicada), mostra tudo em vez de derrubar o Início. */
export async function getPanelPreferences(): Promise<PanelPreferences> {
  const { data, error } = await getSupabase().from("settings").select("panel_preferences").eq("id", 1).single();
  if (error) {
    console.error("[panel-preferences] usando o padrão:", error.message);
    return parsePanelPreferences(null);
  }
  return parsePanelPreferences(data.panel_preferences);
}

export async function savePanelPreferences(prefs: PanelPreferences): Promise<void> {
  unwrap(await getSupabase().from("settings").update({ panel_preferences: prefs }).eq("id", 1));
}
