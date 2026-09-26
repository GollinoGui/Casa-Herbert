import type { Settings } from "@/types";
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
