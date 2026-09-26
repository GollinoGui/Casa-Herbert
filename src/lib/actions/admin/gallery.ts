"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import { createGalleryItem, deleteGalleryItem, type GalleryItemInput } from "@/lib/data/gallery";

function revalidateGalleryPaths() {
  revalidatePath("/admin/galeria");
  revalidatePath("/");
}

export async function createGalleryItemAction(input: GalleryItemInput) {
  await requireAdmin();
  const item = await createGalleryItem(input);
  revalidateGalleryPaths();
  return item;
}

export async function deleteGalleryItemAction(id: string) {
  await requireAdmin();
  await deleteGalleryItem(id);
  revalidateGalleryPaths();
}
