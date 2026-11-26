import type { Payable, PaymentMethod, RecurringBill } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";

function toPayable(r: Record<string, any>): Payable {
  return {
    id: r.id,
    description: r.description,
    category: r.category,
    supplier: r.supplier,
    amountCents: r.amount_cents,
    dueDate: r.due_date,
    status: r.status,
    paidOn: r.paid_on,
    paymentMethod: r.payment_method,
    recurringBillId: r.recurring_bill_id,
    purchaseId: r.purchase_id,
    notes: r.notes,
    createdAt: r.created_at,
  };
}

function toRecurringBill(r: Record<string, any>): RecurringBill {
  return {
    id: r.id,
    description: r.description,
    category: r.category,
    supplier: r.supplier,
    amountCents: r.amount_cents,
    dueDay: r.due_day,
    isActive: r.is_active,
    startsOn: r.starts_on,
  };
}

/** Garante que as contas fixas do mês existam (idempotente — pode rodar a cada abertura da tela). */
export async function generateRecurringPayables(month: string) {
  unwrap(await getSupabase().rpc("generate_recurring_payables", { p_month: month }));
}

export async function listPayables(filters: { dateFrom?: string; dateTo?: string } = {}): Promise<Payable[]> {
  let query = getSupabase().from("payables").select("*").order("due_date", { ascending: true });
  // Em aberto aparecem sempre (inclusive as atrasadas de meses anteriores); pagas e canceladas, só no período.
  if (filters.dateFrom && filters.dateTo) {
    query = query.or(
      `status.eq.open,and(due_date.gte.${filters.dateFrom},due_date.lte.${filters.dateTo}),and(paid_on.gte.${filters.dateFrom},paid_on.lte.${filters.dateTo})`
    );
  }
  return unwrap(await query).map(toPayable);
}

export interface PayableInput {
  description: string;
  category: string;
  supplier: string | null;
  amountCents: number;
  dueDate: string;
  notes: string | null;
}

export async function createPayable(input: PayableInput) {
  unwrap(
    await getSupabase().from("payables").insert({
      description: input.description,
      category: input.category,
      supplier: input.supplier,
      amount_cents: input.amountCents,
      due_date: input.dueDate,
      notes: input.notes,
    })
  );
}

/** Só conta em aberto pode ser editada — a paga já está no livro-caixa. */
export async function updatePayable(id: string, input: PayableInput): Promise<{ ok: boolean; error?: string }> {
  const row = unwrap(
    await getSupabase()
      .from("payables")
      .update({
        description: input.description,
        category: input.category,
        supplier: input.supplier,
        amount_cents: input.amountCents,
        due_date: input.dueDate,
        notes: input.notes,
      })
      .eq("id", id)
      .eq("status", "open")
      .select("id")
      .maybeSingle()
  );
  return row ? { ok: true } : { ok: false, error: "Só contas em aberto podem ser editadas. Desfaça o pagamento antes." };
}

export async function cancelPayable(id: string): Promise<{ ok: boolean; error?: string }> {
  const row = unwrap(
    await getSupabase()
      .from("payables")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("status", "open")
      .select("id")
      .maybeSingle()
  );
  return row ? { ok: true } : { ok: false, error: "Só contas em aberto podem ser canceladas." };
}

type RpcResult = { ok: boolean; error?: string };

export async function payPayable(input: { id: string; amountCents: number; method: PaymentMethod; date: string }) {
  return unwrap(
    await getSupabase().rpc("pay_payable", {
      p_payable_id: input.id,
      p_amount_cents: input.amountCents,
      p_method: input.method,
      p_date: input.date,
    })
  ) as RpcResult;
}

export async function undoPayablePayment(id: string) {
  return unwrap(await getSupabase().rpc("undo_payable_payment", { p_payable_id: id })) as RpcResult;
}

export async function listRecurringBills(): Promise<RecurringBill[]> {
  const rows = unwrap(await getSupabase().from("recurring_bills").select("*").order("due_day"));
  return rows.map(toRecurringBill);
}

export interface RecurringBillInput {
  description: string;
  category: string;
  supplier: string | null;
  amountCents: number;
  dueDay: number;
  isActive: boolean;
}

function recurringRow(input: RecurringBillInput) {
  return {
    description: input.description,
    category: input.category,
    supplier: input.supplier,
    amount_cents: input.amountCents,
    due_day: input.dueDay,
    is_active: input.isActive,
  };
}

export async function saveRecurringBill(id: string | null, input: RecurringBillInput) {
  const supabase = getSupabase();
  if (id) unwrap(await supabase.from("recurring_bills").update(recurringRow(input)).eq("id", id));
  else unwrap(await supabase.from("recurring_bills").insert(recurringRow(input)));
}
