import type { Product } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";
import { toProduct } from "@/lib/supabase/mappers";

function byName(a: Product, b: Product) {
  return a.name.localeCompare(b.name, "pt-BR");
}

export async function getAllProducts(): Promise<Product[]> {
  const rows = unwrap(await getSupabase().from("products").select("*"));
  return rows.map(toProduct).sort(byName);
}

export async function getActiveProducts(): Promise<Product[]> {
  const rows = unwrap(await getSupabase().from("products").select("*").eq("is_active", true));
  return rows.map(toProduct).sort(byName);
}

export async function getProductById(id: string): Promise<Product | null> {
  const row = unwrap(await getSupabase().from("products").select("*").eq("id", id).maybeSingle());
  return row ? toProduct(row) : null;
}

export interface ProductInput {
  name: string;
  priceCents: number;
  stockQuantity: number;
  isActive: boolean;
}

function toRow(input: Partial<ProductInput>) {
  const row: Record<string, unknown> = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.priceCents !== undefined) row.price_cents = input.priceCents;
  if (input.stockQuantity !== undefined) row.stock_quantity = input.stockQuantity;
  if (input.isActive !== undefined) row.is_active = input.isActive;
  return row;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const row = unwrap(await getSupabase().from("products").insert(toRow(input)).select("*").single());
  return toProduct(row);
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product | null> {
  const row = unwrap(
    await getSupabase().from("products").update(toRow(input)).eq("id", id).select("*").maybeSingle()
  );
  return row ? toProduct(row) : null;
}

export async function setProductActive(id: string, isActive: boolean): Promise<Product | null> {
  return updateProduct(id, { isActive });
}
