"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  addCustomerRecordPhoto,
  createCustomerRecord,
  deleteCustomerRecord,
  deleteCustomerRecordPhoto,
  listCustomerRecords,
  setPhotoConsent,
  updateCustomerRecordNotes,
} from "@/lib/data/customer-records";

// Abaixo do limite de corpo da Vercel; a foto é reduzida no navegador antes de subir.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const uuid = z.string().uuid();
const recordSchema = z.object({
  customerId: uuid,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha a data."),
  appointmentId: uuid.nullable(),
  notes: z.string().trim().max(4000, "Anotação muito longa.").nullable(),
});

type Result = { ok: true } | { ok: false; error: string };

export async function listCustomerRecordsAction(customerId: string) {
  await requireAdmin();
  if (!uuid.safeParse(customerId).success) return [];
  return listCustomerRecords(customerId);
}

export async function saveCustomerRecordAction(id: string | null, input: z.infer<typeof recordSchema>): Promise<Result & { id?: string }> {
  await requireAdmin();
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const notes = parsed.data.notes || null;
  if (id) {
    if (!uuid.safeParse(id).success) return { ok: false, error: "Registro inválido." };
    await updateCustomerRecordNotes(id, notes);
    revalidatePath("/admin/clientes");
    return { ok: true, id };
  }
  const newId = await createCustomerRecord({ ...parsed.data, notes });
  revalidatePath("/admin/clientes");
  return { ok: true, id: newId };
}

export async function deleteCustomerRecordAction(id: string): Promise<Result> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return { ok: false, error: "Registro inválido." };
  await deleteCustomerRecord(id);
  revalidatePath("/admin/clientes");
  return { ok: true };
}

/** Só sobe foto com a autorização da cliente registrada na ficha. */
export async function uploadCustomerRecordPhotoAction(formData: FormData): Promise<Result> {
  await requireAdmin();
  const recordId = String(formData.get("recordId") ?? "");
  const file = formData.get("file");
  if (!uuid.safeParse(recordId).success) return { ok: false, error: "Registro inválido." };
  if (!(file instanceof Blob) || file.size === 0) return { ok: false, error: "Selecione uma foto." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "Foto muito grande (máximo 4 MB)." };
  try {
    await addCustomerRecordPhoto(recordId, file);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível enviar a foto." };
  }
  revalidatePath("/admin/clientes");
  return { ok: true };
}

export async function deleteCustomerRecordPhotoAction(photoId: string): Promise<Result> {
  await requireAdmin();
  if (!uuid.safeParse(photoId).success) return { ok: false, error: "Foto inválida." };
  await deleteCustomerRecordPhoto(photoId);
  revalidatePath("/admin/clientes");
  return { ok: true };
}

export async function setPhotoConsentAction(customerId: string, consented: boolean): Promise<Result> {
  await requireAdmin();
  if (!uuid.safeParse(customerId).success) return { ok: false, error: "Cliente inválida." };
  await setPhotoConsent(customerId, consented);
  revalidatePath("/admin/clientes");
  return { ok: true };
}
