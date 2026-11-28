import type { ImagePosition, Product } from "@/types";
import { fetchAll, getSupabase, PG_UNIQUE_VIOLATION, unwrap } from "@/lib/supabase/server";
import { addDaysToDateStr, todayDateStr } from "@/lib/utils/date-format";
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
  barcode?: string | null;
  costCents?: number | null;
  minStock?: number | null;
  brandId?: string | null;
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
  if (input.barcode !== undefined) row.barcode = input.barcode?.trim() || null;
  if (input.costCents !== undefined) row.cost_cents = input.costCents;
  if (input.minStock !== undefined) row.min_stock = input.minStock;
  if (input.brandId !== undefined) row.brand_id = input.brandId || null;
  return row;
}

/** Produtos ativos com aviso ligado e estoque no mínimo ou abaixo, os mais críticos primeiro. */
export async function getLowStockProducts(): Promise<Product[]> {
  const rows = unwrap(
    await getSupabase().from("products").select(PRODUCT_WITH_IMAGE).eq("is_active", true).not("min_stock", "is", null)
  );
  return rows
    .map(toProduct)
    .filter((p) => p.minStock !== null && p.stockQuantity <= p.minStock)
    .sort((a, b) => a.stockQuantity - (a.minStock ?? 0) - (b.stockQuantity - (b.minStock ?? 0)) || a.name.localeCompare(b.name, "pt-BR"));
}

export type SaveProductResult = { ok: true; product: Product } | { ok: false; error: string };

async function barcodeTakenError(barcode: string | null | undefined): Promise<SaveProductResult> {
  const owner = barcode ? await getProductByBarcode(barcode) : null;
  return {
    ok: false,
    error: owner ? `Esse código de barras já é do produto "${owner.name}".` : "Esse código de barras já está em uso.",
  };
}

export async function createProduct(input: ProductInput): Promise<SaveProductResult> {
  const result = await getSupabase().from("products").insert(toRow(input)).select(PRODUCT_WITH_IMAGE).single();
  if (result.error?.code === PG_UNIQUE_VIOLATION) return barcodeTakenError(input.barcode);
  return { ok: true, product: toProduct(unwrap(result)) };
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<SaveProductResult> {
  const result = await getSupabase()
    .from("products")
    .update(toRow(input))
    .eq("id", id)
    .select(PRODUCT_WITH_IMAGE)
    .maybeSingle();
  if (result.error?.code === PG_UNIQUE_VIOLATION) return barcodeTakenError(input.barcode);
  const row = unwrap(result);
  return row ? { ok: true, product: toProduct(row) } : { ok: false, error: "Produto não encontrado." };
}

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const row = unwrap(
    await getSupabase().from("products").select(PRODUCT_WITH_IMAGE).eq("barcode", barcode.trim()).maybeSingle()
  );
  return row ? toProduct(row) : null;
}

export async function setProductActive(id: string, isActive: boolean) {
  return updateProduct(id, { isActive });
}

export interface StockForecast {
  /** Unidades por dia na média da janela (vendas + receita dos serviços). */
  dailyUse: number;
  /** Dias até acabar no ritmo atual; null = sem uso na janela. */
  daysLeft: number | null;
}

/**
 * Ritmo de uso de cada produto nos últimos `windowDays` dias: unidades vendidas
 * (vendas não canceladas) mais o consumo interno pela receita dos serviços
 * concluídos (service_products). É estimativa para montar o pedido de compra.
 */
export async function getStockForecast(windowDays = 30): Promise<Record<string, StockForecast>> {
  const supabase = getSupabase();
  const today = todayDateStr();
  const from = addDaysToDateStr(today, -(windowDays - 1));
  const [sales, completed, recipes, products] = await Promise.all([
    fetchAll<{ id: string }>((a, b) =>
      supabase.from("sales").select("id").neq("status", "cancelled").gte("sale_date", from).lte("sale_date", today).order("id").range(a, b)
    ),
    fetchAll<{ id: string; service_id: string }>((a, b) =>
      supabase
        .from("appointments")
        .select("id, service_id")
        .eq("status", "COMPLETED")
        .gte("appointment_date", from)
        .lte("appointment_date", today)
        .order("id")
        .range(a, b)
    ),
    supabase.from("service_products").select("service_id, product_id, quantity"),
    supabase.from("products").select("id, stock_quantity").eq("is_active", true),
  ]);

  const used = new Map<string, number>();
  const add = (productId: string, qty: number) => used.set(productId, (used.get(productId) ?? 0) + qty);

  // Lotes para a URL do PostgREST não estourar com muitas vendas.
  for (let i = 0; i < sales.length; i += 200) {
    const ids = sales.slice(i, i + 200).map((s) => s.id);
    const items = unwrap(
      await supabase.from("sale_items").select("ref_id, quantity").eq("item_type", "product").in("sale_id", ids)
    );
    for (const item of items) if (item.ref_id) add(item.ref_id, item.quantity);
  }

  const servicesDone = new Map<string, number>();
  for (const a of completed) servicesDone.set(a.service_id, (servicesDone.get(a.service_id) ?? 0) + 1);
  for (const line of unwrap(recipes)) {
    const times = servicesDone.get(line.service_id);
    if (times) add(line.product_id, Number(line.quantity) * times);
  }

  const out: Record<string, StockForecast> = {};
  for (const p of unwrap(products)) {
    const dailyUse = (used.get(p.id) ?? 0) / windowDays;
    out[p.id] = { dailyUse, daysLeft: dailyUse > 0 ? Math.floor(p.stock_quantity / dailyUse) : null };
  }
  return out;
}
