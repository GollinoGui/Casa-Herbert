import type { ImagePosition, Media, ResolvedImage, SiteImageSlotAssignment } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";
import { toMedia } from "@/lib/supabase/mappers";

export const MEDIA_BUCKET = "site-images";

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export const ACCEPTED_IMAGE_TYPES = Object.keys(EXTENSION_BY_TYPE);

export async function listMedia(): Promise<Media[]> {
  const rows = unwrap(await getSupabase().from("media").select("*").order("created_at", { ascending: false }));
  return rows.map(toMedia);
}

export interface UploadMediaInput {
  file: Blob;
  alt: string | null;
  width: number | null;
  height: number | null;
}

export async function uploadMedia(input: UploadMediaInput): Promise<Media> {
  const extension = EXTENSION_BY_TYPE[input.file.type];
  if (!extension) throw new Error("Formato de imagem não suportado.");

  const supabase = getSupabase();
  const path = `uploads/${crypto.randomUUID()}.${extension}`;
  unwrap(
    await supabase.storage.from(MEDIA_BUCKET).upload(path, input.file, {
      contentType: input.file.type,
      // O nome é único por upload, então o arquivo nunca muda — pode ficar em cache para sempre.
      cacheControl: "31536000",
    })
  );
  const url = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;

  const inserted = await supabase
    .from("media")
    .insert({ url, storage_path: path, alt: input.alt, width: input.width, height: input.height })
    .select("*")
    .single();
  if (inserted.error) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    throw new Error(inserted.error.message);
  }
  return toMedia(inserted.data);
}

/** Os lugares que usavam a foto voltam ao placeholder (FKs on delete cascade / set null). */
export async function deleteMedia(id: string): Promise<void> {
  const supabase = getSupabase();
  const row = unwrap(await supabase.from("media").delete().eq("id", id).select("storage_path").maybeSingle());
  if (row?.storage_path) {
    await supabase.storage.from(MEDIA_BUCKET).remove([row.storage_path]);
  }
}

export async function getSlotAssignments(): Promise<SiteImageSlotAssignment[]> {
  const rows = unwrap(await getSupabase().from("site_image_slots").select("slot_key, media_id, object_position, media(url)"));
  return rows.map((r: Record<string, any>) => ({
    slotKey: r.slot_key,
    mediaId: r.media_id,
    url: r.media?.url,
    position: r.object_position,
  }));
}

export async function getSiteImageMap(): Promise<Record<string, ResolvedImage>> {
  const assignments = await getSlotAssignments();
  return Object.fromEntries(assignments.map((a) => [a.slotKey, { src: a.url, position: a.position }]));
}

export async function setSlotImage(slotKey: string, mediaId: string, position: ImagePosition | null): Promise<void> {
  unwrap(
    await getSupabase()
      .from("site_image_slots")
      .upsert({ slot_key: slotKey, media_id: mediaId, object_position: position }, { onConflict: "slot_key" })
  );
}

export async function clearSlotImage(slotKey: string): Promise<void> {
  unwrap(await getSupabase().from("site_image_slots").delete().eq("slot_key", slotKey));
}
