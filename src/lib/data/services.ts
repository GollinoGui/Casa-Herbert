import type { ImagePosition, Service } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";
import { SERVICE_WITH_IMAGE, toService } from "@/lib/supabase/mappers";

export async function getActiveServices(): Promise<Service[]> {
  const rows = unwrap(
    await getSupabase().from("services").select(SERVICE_WITH_IMAGE).eq("is_active", true).order("display_order")
  );
  return rows.map(toService);
}

export async function getAllServices(): Promise<Service[]> {
  const rows = unwrap(await getSupabase().from("services").select(SERVICE_WITH_IMAGE).order("display_order"));
  return rows.map(toService);
}

export async function getServiceById(id: string): Promise<Service | null> {
  const row = unwrap(await getSupabase().from("services").select(SERVICE_WITH_IMAGE).eq("id", id).maybeSingle());
  return row ? toService(row) : null;
}

export interface ServiceInput {
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number | null;
  isActive: boolean;
  imageId: string | null;
  imagePosition: ImagePosition | null;
  showOnHome: boolean;
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
  if (input.imageId !== undefined) row.image_id = input.imageId;
  if (input.imagePosition !== undefined) row.image_position = input.imagePosition;
  if (input.showOnHome !== undefined) row.show_on_home = input.showOnHome;
  return row;
}

export async function createService(input: ServiceInput): Promise<Service> {
  const supabase = getSupabase();
  const { count } = await supabase.from("services").select("id", { count: "exact", head: true });
  const row = unwrap(
    await supabase
      .from("services")
      .insert({ ...toRow(input), price_cents: input.priceCents ?? null, display_order: (count ?? 0) + 1 })
      .select(SERVICE_WITH_IMAGE)
      .single()
  );
  return toService(row);
}

export async function updateService(id: string, input: Partial<ServiceInput>): Promise<Service | null> {
  const row = unwrap(
    await getSupabase().from("services").update(toRow(input)).eq("id", id).select(SERVICE_WITH_IMAGE).maybeSingle()
  );
  return row ? toService(row) : null;
}

export async function setServiceActive(id: string, isActive: boolean): Promise<Service | null> {
  return updateService(id, { isActive });
}

/**
 * Troca a posição com o vizinho (ordem do site e do carrossel). Renumera tudo
 * em sequência: display_order pode ter empates/buracos vindos de criações antigas.
 */
export async function moveService(id: string, direction: "up" | "down"): Promise<void> {
  const services = await getAllServices();
  const index = services.findIndex((s) => s.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= services.length) return;

  const ordered = [...services];
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

  const supabase = getSupabase();
  await Promise.all(
    ordered
      .map((s, i) => ({ s, order: i + 1 }))
      .filter(({ s, order }) => s.displayOrder !== order)
      .map(async ({ s, order }) =>
        unwrap(await supabase.from("services").update({ display_order: order }).eq("id", s.id))
      )
  );
}
