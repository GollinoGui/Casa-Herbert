import { randomUUID } from "node:crypto";
import type { GalleryItem } from "@/types";
import { mutateDb, readDb } from "./store";

export async function getPublishedGallery(): Promise<GalleryItem[]> {
  const db = readDb();
  return db.gallery.filter((g) => g.isPublished).sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function getAllGallery(): Promise<GalleryItem[]> {
  const db = readDb();
  return [...db.gallery].sort((a, b) => a.displayOrder - b.displayOrder);
}

export interface GalleryItemInput {
  caption: string;
  category: string;
  isPublished: boolean;
}

export async function createGalleryItem(input: GalleryItemInput): Promise<GalleryItem> {
  return mutateDb((db) => {
    const item: GalleryItem = {
      id: randomUUID(),
      ...input,
      displayOrder: db.gallery.length + 1,
      createdAt: new Date().toISOString(),
    };
    db.gallery.push(item);
    return item;
  });
}

export async function deleteGalleryItem(id: string): Promise<void> {
  mutateDb((db) => {
    db.gallery = db.gallery.filter((g) => g.id !== id);
  });
}
