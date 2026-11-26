import type { PaymentMethod, Purchase } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";

export interface RegisterPurchaseInput {
  supplier: string | null;
  purchaseDate: string;
  dueDate: string | null;
  notes: string | null;
  paidNow: boolean;
  method: PaymentMethod | null;
  items: { productId: string | null; description: string | null; quantity: number; unitCostCents: number }[];
}

/** Atômico no banco (register_purchase em 0012): soma o estoque, atualiza o custo e cria a conta a pagar. */
export async function registerPurchase(input: RegisterPurchaseInput): Promise<{ ok: boolean; error?: string }> {
  const result = await getSupabase().rpc("register_purchase", { p: input });
  // O RPC lança (em vez de devolver ok:false) quando um produto some no meio da compra.
  if (result.error) return { ok: false, error: result.error.message };
  return result.data as { ok: boolean; error?: string };
}

export async function listPurchases(filters: { dateFrom?: string; dateTo?: string } = {}): Promise<Purchase[]> {
  let query = getSupabase()
    .from("purchases")
    .select("*, purchase_items(*), payables(id, status, due_date)")
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (filters.dateFrom) query = query.gte("purchase_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("purchase_date", filters.dateTo);

  return unwrap(await query).map((r) => {
    const payable = (r.payables as Record<string, any>[] | null)?.[0];
    return {
      id: r.id,
      supplier: r.supplier,
      purchaseDate: r.purchase_date,
      totalCents: r.total_cents,
      notes: r.notes,
      items: ((r.purchase_items ?? []) as Record<string, any>[]).map((i) => ({
        productId: i.product_id,
        description: i.description,
        quantity: i.quantity,
        unitCostCents: i.unit_cost_cents,
        totalCents: i.total_cents,
      })),
      payable: payable ? { id: payable.id, status: payable.status, dueDate: payable.due_date } : null,
      createdAt: r.created_at,
    };
  });
}
