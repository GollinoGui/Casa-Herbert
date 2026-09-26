import type { GalleryItem } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";
import { toGalleryItem } from "@/lib/supabase/mappers";

export async function getPublishedGallery(): Promise<GalleryItem[]> {
  const rows = unwrap(
    await getSupabase().from("gallery").select("*").eq("is_published", true).order("display_order")
  );
  return rows.map(toGalleryItem);
}

export async function getAllGallery(): Promise<GalleryItem[]> {
  const rows = unwrap(await getSupabase().from("gallery").select("*").order("display_order"));
  return rows.map(toGalleryItem);
}

export interface GalleryItemInput {
  caption: string;
  category: string;
  isPublished: boolean;
}

export async function createGalleryItem(input: GalleryItemInput): Promise<GalleryItem> {
  const supabase = getSupabase();
  const { count } = await supabase.from("gallery").select("id", { count: "exact", head: true });
  const row = unwrap(
    await supabase
      .from("gallery")
      .insert({
        caption: input.caption,
        category: input.category,
        is_published: input.isPublished,
        display_order: (count ?? 0) + 1,
      })
      .select("*")
      .single()
  );
  return toGalleryItem(row);
}

export async function deleteGalleryItem(id: string): Promise<void> {
  unwrap(await getSupabase().from("gallery").delete().eq("id", id));
}
