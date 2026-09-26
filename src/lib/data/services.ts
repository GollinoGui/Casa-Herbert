import type { Service } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";
import { toService } from "@/lib/supabase/mappers";

export async function getActiveServices(): Promise<Service[]> {
  const rows = unwrap(
    await getSupabase().from("services").select("*").eq("is_active", true).order("display_order")
  );
  return rows.map(toService);
}

export async function getAllServices(): Promise<Service[]> {
  const rows = unwrap(await getSupabase().from("services").select("*").order("display_order"));
  return rows.map(toService);
}

export async function getServiceById(id: string): Promise<Service | null> {
  const row = unwrap(await getSupabase().from("services").select("*").eq("id", id).maybeSingle());
  return row ? toService(row) : null;
}

export interface ServiceInput {
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number | null;
  isActive: boolean;
}

const DIACRITICS_REGEX = /[̀-ͯ]/g;

function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toRow(input: Partial<ServiceInput>) {
  const row: Record<string, unknown> = {};
  if (input.name !== undefined) {
    row.name = input.name;
    row.slug = slugify(input.name);
  }
  if (input.description !== undefined) row.description = input.description;
  if (input.durationMinutes !== undefined) row.duration_minutes = input.durationMinutes;
  if (input.priceCents !== undefined) row.price_cents = input.priceCents;
  if (input.isActive !== undefined) row.is_active = input.isActive;
  return row;
}

export async function createService(input: ServiceInput): Promise<Service> {
  const supabase = getSupabase();
  const { count } = await supabase.from("services").select("id", { count: "exact", head: true });
  const row = unwrap(
    await supabase
      .from("services")
      .insert({ ...toRow(input), price_cents: input.priceCents ?? null, display_order: (count ?? 0) + 1 })
      .select("*")
      .single()
  );
  return toService(row);
}

export async function updateService(id: string, input: Partial<ServiceInput>): Promise<Service | null> {
  const row = unwrap(
    await getSupabase().from("services").update(toRow(input)).eq("id", id).select("*").maybeSingle()
  );
  return row ? toService(row) : null;
}

export async function setServiceActive(id: string, isActive: boolean): Promise<Service | null> {
  return updateService(id, { isActive });
}
