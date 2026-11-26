import type { CustomerRecord } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/data/media";

/** Bucket PRIVADO (0017): foto de couro cabeludo nunca vai para o site-images, que é público. */
export const CUSTOMER_PHOTOS_BUCKET = "customer-photos";
const SIGNED_URL_SECONDS = 60 * 30;

type Row = Record<string, any>;

export async function listCustomerRecords(customerId: string): Promise<CustomerRecord[]> {
  const supabase = getSupabase();
  const rows = unwrap(
    await supabase
      .from("customer_records")
      .select("*, photos:customer_record_photos(id, storage_path)")
      .eq("customer_id", customerId)
      .order("record_date", { ascending: false })
      .order("created_at", { ascending: false })
  );
  const paths = rows.flatMap((r: Row) => (r.photos ?? []).map((p: Row) => p.storage_path as string));
  const signed = new Map<string, string | null>();
  if (paths.length) {
    const { data, error } = await supabase.storage.from(CUSTOMER_PHOTOS_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
    if (error) throw new Error(error.message);
    for (const item of data ?? []) if (item.path) signed.set(item.path, item.signedUrl ?? null);
  }
  return rows.map(
    (r: Row): CustomerRecord => ({
      id: r.id,
      customerId: r.customer_id,
      date: r.record_date,
      appointmentId: r.appointment_id ?? null,
      notes: r.notes ?? null,
      photos: (r.photos ?? []).map((p: Row) => ({ id: p.id, url: signed.get(p.storage_path) ?? null })),
      createdAt: r.created_at,
    })
  );
}

export async function createCustomerRecord(input: {
  customerId: string;
  date: string;
  appointmentId: string | null;
  notes: string | null;
}): Promise<string> {
  const row = unwrap(
    await getSupabase()
      .from("customer_records")
      .insert({ customer_id: input.customerId, record_date: input.date, appointment_id: input.appointmentId, notes: input.notes })
      .select("id")
      .single()
  );
  return row.id;
}

export async function updateCustomerRecordNotes(id: string, notes: string | null): Promise<void> {
  unwrap(await getSupabase().from("customer_records").update({ notes }).eq("id", id));
}

const EXTENSION: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function addCustomerRecordPhoto(recordId: string, file: Blob): Promise<void> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || !EXTENSION[file.type]) throw new Error("Formato não suportado. Use JPG, PNG ou WebP.");
  const supabase = getSupabase();
  const record = unwrap(
    await supabase.from("customer_records").select("customer_id, customer:customers(photo_consent_at)").eq("id", recordId).maybeSingle()
  ) as { customer_id: string; customer: { photo_consent_at: string | null } | null } | null;
  if (!record) throw new Error("Registro não encontrado.");
  if (!record.customer?.photo_consent_at) throw new Error("Registre antes a autorização da cliente para fotos.");
  const path = `${record.customer_id}/${crypto.randomUUID()}.${EXTENSION[file.type]}`;
  unwrap(await supabase.storage.from(CUSTOMER_PHOTOS_BUCKET).upload(path, file, { contentType: file.type }));
  const inserted = await supabase.from("customer_record_photos").insert({ record_id: recordId, storage_path: path });
  if (inserted.error) {
    await supabase.storage.from(CUSTOMER_PHOTOS_BUCKET).remove([path]);
    throw new Error(inserted.error.message);
  }
}

export async function deleteCustomerRecordPhoto(photoId: string): Promise<void> {
  const supabase = getSupabase();
  const row = unwrap(await supabase.from("customer_record_photos").delete().eq("id", photoId).select("storage_path").maybeSingle());
  if (row?.storage_path) await supabase.storage.from(CUSTOMER_PHOTOS_BUCKET).remove([row.storage_path]);
}

/** Apaga o registro e os arquivos das fotos (o banco apaga as linhas em cascata). */
export async function deleteCustomerRecord(id: string): Promise<void> {
  const supabase = getSupabase();
  const photos = unwrap(await supabase.from("customer_record_photos").select("storage_path").eq("record_id", id));
  unwrap(await supabase.from("customer_records").delete().eq("id", id));
  if (photos.length) await supabase.storage.from(CUSTOMER_PHOTOS_BUCKET).remove(photos.map((p) => p.storage_path));
}

export async function setPhotoConsent(customerId: string, consented: boolean): Promise<void> {
  unwrap(
    await getSupabase()
      .from("customers")
      .update({ photo_consent_at: consented ? new Date().toISOString() : null })
      .eq("id", customerId)
  );
}
