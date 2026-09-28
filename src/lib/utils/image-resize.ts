const MAX_SIDE = 2000;
const QUALITY = 0.85;

export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Foto de celular chega com 5–12 MB; reduz para no máximo 2000px no lado maior e
 * reencoda em WebP antes do upload (o corpo da Server Action tem limite de ~4 MB na
 * Vercel, e o site não precisa de mais que isso). Só roda no navegador.
 */
export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Não foi possível ler esta imagem. Use uma foto em JPG, PNG ou WebP.");
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não conseguiu processar a imagem.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", QUALITY));
  // Safari antigo não gera WebP e devolve PNG (pesado) — nesse caso, JPEG.
  if (blob && blob.type === "image/webp") return { blob, width, height };
  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!jpeg) throw new Error("Seu navegador não conseguiu processar a imagem.");
  return { blob: jpeg, width, height };
}
