import type { PaymentMethod, Sale, SaleItem } from "@/types";
import { addDaysToDateStr, salonDateOf } from "@/lib/utils/date-format";
import { getSupabase, unwrap } from "@/lib/supabase/server";

export interface CheckoutProductLineInput {
  productId: string;
  quantity: number;
}

export interface CheckoutInput {
  appointmentId?: string | null;
  customerId?: string | null;
  serviceLine?: { unitPriceCents: number } | null;
  productLines: CheckoutProductLineInput[];
  paymentMethod: PaymentMethod;
  notes?: string | null;
}

export type CheckoutResult = { ok: true; sale: Sale } | { ok: false; error: string };

const SALE_WITH_ITEMS = "*, sale_items(*)";

function toSale(r: Record<string, any>): Sale {
  const items: SaleItem[] = ((r.sale_items ?? []) as Record<string, any>[])
    // serviço primeiro, como o checkout monta — a UI trata items[0] como a linha do serviço
    .sort((a, b) => (a.item_type === b.item_type ? 0 : a.item_type === "service" ? -1 : 1))
    .map((i) => ({
      type: i.item_type,
      refId: i.ref_id,
      description: i.description,
      unitPriceCents: i.unit_price_cents,
      quantity: i.quantity,
      totalCents: i.total_cents,
    }));
  return {
    id: r.id,
    appointmentId: r.appointment_id,
    customerId: r.customer_id,
    items,
    totalCents: r.total_cents,
    paymentMethod: r.payment_method,
    notes: r.notes,
    createdAt: r.created_at,
  };
}

/**
 * Atômico no banco (RPC checkout_sale em 0006_production_fixes.sql): valida TODAS as
 * linhas de produto antes de baixar qualquer estoque — nada de baixa parcial se uma
 * linha no meio da lista falhar a validação.
 */
export async function checkout(input: CheckoutInput): Promise<CheckoutResult> {
  const supabase = getSupabase();
  const result = unwrap(
    await supabase.rpc("checkout_sale", {
      p_appointment_id: input.appointmentId ?? null,
      p_customer_id: input.customerId ?? null,
      p_service_unit_price_cents: input.serviceLine?.unitPriceCents ?? null,
      p_product_lines: input.productLines,
      p_payment_method: input.paymentMethod,
      p_notes: input.notes ?? null,
    })
  ) as { ok: boolean; error?: string; saleId?: string };

  if (!result.ok || !result.saleId) return { ok: false, error: result.error ?? "Erro ao finalizar a venda." };

  const sale = unwrap(await supabase.from("sales").select(SALE_WITH_ITEMS).eq("id", result.saleId).single());
  return { ok: true, sale: toSale(sale) };
}

export async function listSales(filters?: { dateFrom?: string; dateTo?: string }): Promise<Sale[]> {
  let query = getSupabase().from("sales").select(SALE_WITH_ITEMS).order("created_at", { ascending: false });
  // Margem de um dia no filtro do banco: created_at é UTC, a comparação fina é no fuso do salão.
  if (filters?.dateFrom) query = query.gte("created_at", addDaysToDateStr(filters.dateFrom, -1));
  if (filters?.dateTo) query = query.lt("created_at", addDaysToDateStr(filters.dateTo, 2));

  return unwrap(await query)
    .map(toSale)
    .filter((s) => {
      const date = salonDateOf(s.createdAt);
      return (!filters?.dateFrom || date >= filters.dateFrom) && (!filters?.dateTo || date <= filters.dateTo);
    });
}
