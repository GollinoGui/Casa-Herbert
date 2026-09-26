import type { SpecialHours, TimeRange } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";
import { toSpecialHours } from "@/lib/supabase/mappers";

export async function getSpecialHours(): Promise<SpecialHours[]> {
  const rows = unwrap(
    await getSupabase().from("special_hours").select("*, special_hours_ranges(*)").order("special_date")
  );
  return rows.map(toSpecialHours);
}

export async function upsertSpecialHours(input: {
  date: string;
  isClosed: boolean;
  reason?: string;
  ranges: TimeRange[];
}): Promise<SpecialHours> {
  const supabase = getSupabase();
  const id = unwrap(
    await supabase.rpc("upsert_special_hours", {
      p_date: input.date,
      p_is_closed: input.isClosed,
      p_reason: input.reason ?? null,
      p_ranges: input.ranges,
    })
  );

  const row = unwrap(
    await supabase.from("special_hours").select("*, special_hours_ranges(*)").eq("id", id).single()
  );
  return toSpecialHours(row);
}

export async function deleteSpecialHours(id: string): Promise<void> {
  unwrap(await getSupabase().from("special_hours").delete().eq("id", id));
}
