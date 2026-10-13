import type { ImagePosition, Product } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";
import { PRODUCT_WITH_IMAGE, toProduct } from "@/lib/supabase/mappers";

function byName(a: Product, b: Product) {
  return a.name.localeCompare(b.name, "pt-BR");
}

export async function getAllProducts(): Promise<Product[]> {
  const rows = unwrap(await getSupabase().from("products").select(PRODUCT_WITH_IMAGE));
  return rows.map(toProduct).sort(byName);
}

export async function getActiveProducts(): Promise<Product[]> {
  const rows = unwrap(await getSupabase().from("products").select(PRODUCT_WITH_IMAGE).eq("is_active", true));
  return rows.map(toProduct).sort(byName);
}

/** Vitrine do site: ativos e marcados para aparecer, na ordem do nome. */
export async function getShowcaseProducts(): Promise<Product[]> {
  const rows = unwrap(
    await getSupabase().from("products").select(PRODUCT_WITH_IMAGE).eq("is_active", true).eq("show_on_site", true)
  );
  return rows.map(toProduct).sort(byName);
}

export async function getProductById(id: string): Promise<Product | null> {
  const row = unwrap(await getSupabase().from("products").select(PRODUCT_WITH_IMAGE).eq("id", id).maybeSingle());
  return row ? toProduct(row) : null;
}

export interface ProductInput {
  name: string;
  priceCents: number;
  stockQuantity: number;
  isActive: boolean;
  description?: string;
  imageId?: string | null;
  imagePosition?: ImagePosition | null;
  showOnSite?: boolean;
}

function toRow(input: Partial<ProductInput>) {
  const row: Record<string, unknown> = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.priceCents !== undefined) row.price_cents = input.priceCents;
  if (input.stockQuantity !== undefined) row.stock_quantity = input.stockQuantity;
  if (input.isActive !== undefined) row.is_active = input.isActive;
  if (input.description !== undefined) row.description = input.description || null;
  if (input.imageId !== undefined) row.image_id = input.imageId;
  if (input.imagePosition !== undefined) row.image_position = input.imagePosition;
  if (input.showOnSite !== undefined) row.show_on_site = input.showOnSite;
  return row;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const row = unwrap(await getSupabase().from("products").insert(toRow(input)).select(PRODUCT_WITH_IMAGE).single());
  return toProduct(row);
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product | null> {
  const row = unwrap(
    await getSupabase().from("products").update(toRow(input)).eq("id", id).select(PRODUCT_WITH_IMAGE).maybeSingle()
  );
  return row ? toProduct(row) : null;
}

export async function setProductActive(id: string, isActive: boolean): Promise<Product | null> {
  return updateProduct(id, { isActive });
}
