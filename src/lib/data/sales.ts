import type { PaymentMethod, Sale, SaleItem, SaleStatus } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";

export type SaleLineInput =
  | { type: "service"; serviceId: string; unitPriceCents: number; quantity?: number }
  | { type: "product"; productId: string; quantity: number; unitPriceCents?: number }
  | { type: "custom"; description: string; unitPriceCents: number; quantity?: number };

export interface RegisterSaleInput {
  appointmentId?: string | null;
  customerId?: string | null;
  saleDate?: string | null;
  dueDate?: string | null;
  discountCents?: number;
  notes?: string | null;
  items: SaleLineInput[];
  /** Ausente = tudo fica em aberto (conta a receber). */
  payment?: { amountCents: number; method: PaymentMethod; receiptTxid?: string | null } | null;
}

export type SaleActionResult = { ok: true; saleId?: string } | { ok: false; error: string };

const SALE_SELECT = "*, sale_items(*), customer:customers(id, full_name, phone)";

function toSale(r: Record<string, any>): Sale {
  const items: SaleItem[] = ((r.sale_items ?? []) as Record<string, any>[])
    // serviço primeiro, como a venda é montada
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
    customer: r.customer ? { id: r.customer.id, fullName: r.customer.full_name, phone: r.customer.phone } : null,
    items,
    discountCents: r.discount_cents ?? 0,
    totalCents: r.total_cents,
    paidCents: r.paid_cents ?? 0,
    status: r.status,
    paymentMethod: r.payment_method,
    notes: r.notes,
    saleDate: r.sale_date,
    dueDate: r.due_date,
    paidAt: r.paid_at,
    cancelledAt: r.cancelled_at,
    createdAt: r.created_at,
  };
}

type RpcResult = { ok: boolean; error?: string; saleId?: string };

function toResult(r: RpcResult, fallback: string): SaleActionResult {
  return r.ok ? { ok: true, saleId: r.saleId } : { ok: false, error: r.error ?? fallback };
}

/** Atômico no banco (register_sale em 0012): valida estoque de todas as linhas antes de baixar qualquer uma. */
export async function registerSale(input: RegisterSaleInput): Promise<SaleActionResult> {
  const result = unwrap(await getSupabase().rpc("register_sale", { p: input })) as RpcResult;
  return toResult(result, "Erro ao registrar a venda.");
}

export async function receiveSalePayment(input: {
  saleId: string;
  amountCents: number;
  method: PaymentMethod;
  date: string;
  receiptTxid?: string | null;
}): Promise<SaleActionResult> {
  const result = unwrap(
    await getSupabase().rpc("receive_sale_payment", {
      p_sale_id: input.saleId,
      p_amount_cents: input.amountCents,
      p_method: input.method,
      p_date: input.date,
      p_receipt_txid: input.receiptTxid ?? null,
    })
  ) as RpcResult;
  return toResult(result, "Erro ao registrar o recebimento.");
}

export async function cancelSale(saleId: string, reason?: string): Promise<SaleActionResult> {
  const result = unwrap(
    await getSupabase().rpc("cancel_sale", { p_sale_id: saleId, p_reason: reason ?? null })
  ) as RpcResult;
  return toResult(result, "Erro ao cancelar a venda.");
}

export interface SaleFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: SaleStatus[];
  customerId?: string;
  appointmentId?: string;
}

export async function listSales(filters: SaleFilters = {}): Promise<Sale[]> {
  let query = getSupabase()
    .from("sales")
    .select(SALE_SELECT)
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (filters.dateFrom) query = query.gte("sale_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("sale_date", filters.dateTo);
  if (filters.status?.length) query = query.in("status", filters.status);
  if (filters.customerId) query = query.eq("customer_id", filters.customerId);
  if (filters.appointmentId) query = query.eq("appointment_id", filters.appointmentId);
  return unwrap(await query).map(toSale);
}

/** Contas a receber: vendas em aberto, vencimento mais antigo primeiro. */
export async function listOpenSales(customerId?: string): Promise<Sale[]> {
  let query = getSupabase()
    .from("sales")
    .select(SALE_SELECT)
    .eq("status", "open")
    .order("due_date", { ascending: true });
  if (customerId) query = query.eq("customer_id", customerId);
  return unwrap(await query).map(toSale);
}
