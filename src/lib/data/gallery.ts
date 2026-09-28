import type { GalleryItem } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";
import { GALLERY_WITH_IMAGE, toGalleryItem } from "@/lib/supabase/mappers";

export async function getPublishedGallery(): Promise<GalleryItem[]> {
  const rows = unwrap(
    await getSupabase().from("gallery").select(GALLERY_WITH_IMAGE).eq("is_published", true).order("display_order")
  );
  return rows.map(toGalleryItem);
}

export async function getAllGallery(): Promise<GalleryItem[]> {
  const rows = unwrap(await getSupabase().from("gallery").select(GALLERY_WITH_IMAGE).order("display_order"));
  return rows.map(toGalleryItem);
}

export interface GalleryItemInput {
  caption: string;
  category: string;
  isPublished: boolean;
  mediaId: string | null;
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
        media_id: input.mediaId,
        display_order: (count ?? 0) + 1,
      })
      .select(GALLERY_WITH_IMAGE)
      .single()
  );
  return toGalleryItem(row);
}

export async function updateGalleryItemImage(id: string, mediaId: string | null): Promise<void> {
  unwrap(await getSupabase().from("gallery").update({ media_id: mediaId }).eq("id", id));
}

export async function deleteGalleryItem(id: string): Promise<void> {
  unwrap(await getSupabase().from("gallery").delete().eq("id", id));
}
