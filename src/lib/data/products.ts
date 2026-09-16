import { randomUUID } from "node:crypto";
import type { Product } from "@/types";
import { mutateDb, readDb } from "./store";

export async function getAllProducts(): Promise<Product[]> {
  const db = readDb();
  return [...db.products].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function getActiveProducts(): Promise<Product[]> {
  const db = readDb();
  return db.products
    .filter((p) => p.isActive)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function getProductById(id: string): Promise<Product | null> {
  const db = readDb();
  return db.products.find((p) => p.id === id) ?? null;
}

export interface ProductInput {
  name: string;
  priceCents: number;
  stockQuantity: number;
  isActive: boolean;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  return mutateDb((db) => {
    const now = new Date().toISOString();
    const product: Product = {
      id: randomUUID(),
      name: input.name,
      priceCents: input.priceCents,
      stockQuantity: input.stockQuantity,
      isActive: input.isActive,
      createdAt: now,
      updatedAt: now,
    };
    db.products.push(product);
    return product;
  });
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product | null> {
  return mutateDb((db) => {
    const product = db.products.find((p) => p.id === id);
    if (!product) return null;
    Object.assign(product, input, { updatedAt: new Date().toISOString() });
    return product;
  });
}

export async function setProductActive(id: string, isActive: boolean): Promise<Product | null> {
  return updateProduct(id, { isActive });
}
