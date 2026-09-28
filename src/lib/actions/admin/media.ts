"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import {
  ACCEPTED_IMAGE_TYPES,
  clearSlotImage,
  deleteMedia,
  listMedia,
  setSlotImage,
  uploadMedia,
} from "@/lib/data/media";
import { SITE_IMAGE_SLOT_KEYS } from "@/lib/site-images/slots";
import type { ImagePosition, Media } from "@/types";

// Abaixo do limite de corpo de requisição da Vercel (4,5 MB). O painel reduz a
// foto no navegador antes de enviar, então isso só barra arquivos que não deu para reduzir.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const POSITIONS: ImagePosition[] = ["center", "top", "bottom"];

function revalidateSite() {
  revalidatePath("/", "layout");
}

function parseDimension(value: FormDataEntryValue | null): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function listMediaAction(): Promise<Media[]> {
  await requireAdmin();
  return listMedia();
}

export async function uploadMediaAction(
  formData: FormData
): Promise<{ ok: true; media: Media } | { ok: false; error: string }> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) return { ok: false, error: "Selecione uma imagem." };
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { ok: false, error: "Formato não suportado. Use JPG, PNG ou WebP." };
  }
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "Imagem muito grande (máximo 4 MB)." };

  const alt = String(formData.get("alt") ?? "").trim() || null;
  const media = await uploadMedia({
    file,
    alt,
    width: parseDimension(formData.get("width")),
    height: parseDimension(formData.get("height")),
  });
  revalidatePath("/admin/fotos");
  return { ok: true, media };
}

export async function deleteMediaAction(id: string) {
  await requireAdmin();
  await deleteMedia(id);
  revalidateSite();
}

export async function setSlotImageAction(slotKey: string, mediaId: string, position: ImagePosition | null) {
  await requireAdmin();
  if (!SITE_IMAGE_SLOT_KEYS.has(slotKey)) throw new Error("Espaço de foto desconhecido.");
  await setSlotImage(slotKey, mediaId, position && POSITIONS.includes(position) ? position : null);
  revalidateSite();
}

export async function clearSlotImageAction(slotKey: string) {
  await requireAdmin();
  await clearSlotImage(slotKey);
  revalidateSite();
}
