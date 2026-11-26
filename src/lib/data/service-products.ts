import type { ServiceProduct } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";

/** Receita de consumo de todos os serviços, agrupada por serviço. */
export async function getServiceRecipes(): Promise<Record<string, ServiceProduct[]>> {
  const rows = unwrap(
    await getSupabase().from("service_products").select("service_id, product_id, quantity, product:products(name)")
  ) as Record<string, any>[];
  const byService: Record<string, ServiceProduct[]> = {};
  for (const r of rows) {
    (byService[r.service_id] ??= []).push({
      productId: r.product_id,
      quantity: Number(r.quantity),
      name: r.product?.name ?? "Produto",
    });
  }
  for (const list of Object.values(byService)) list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return byService;
}

/** Troca a receita inteira numa transação (RPC replace_service_products, 0016). */
export async function replaceServiceRecipe(serviceId: string, lines: { productId: string; quantity: number }[]) {
  unwrap(await getSupabase().rpc("replace_service_products", { p_service_id: serviceId, p_lines: lines }));
}
