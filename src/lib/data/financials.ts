import type { CashDirection, CashEntry, PaymentMethod } from "@/types";
import { addDaysToDateStr, todayDateStr } from "@/lib/utils/date-format";
import { fetchAll, getSupabase, unwrap } from "@/lib/supabase/server";

/**
 * Todo dinheiro que entra ou sai passa por cash_entries (livro-caixa, 0012). O saldo
 * é a soma dele inteiro — não há coluna de saldo para ficar desatualizada, e o saldo
 * de um mês carrega para o próximo sozinho.
 */

function toCashEntry(r: Record<string, any>, reversedIds: Set<string>): CashEntry {
  return {
    id: r.id,
    entryDate: r.entry_date,
    direction: r.direction,
    amountCents: r.amount_cents,
    category: r.category,
    description: r.description,
    paymentMethod: r.payment_method,
    saleId: r.sale_id,
    payableId: r.payable_id,
    customerId: r.customer_id,
    customerName: r.customer?.full_name ?? null,
    receiptTxid: r.receipt_txid,
    reversalOf: r.reversal_of,
    reversed: reversedIds.has(r.id),
    createdAt: r.created_at,
  };
}

function signed(direction: CashDirection, amount: number) {
  return direction === "in" ? amount : -amount;
}

/** Saldo acumulado até o fim do dia `untilDate` (inclusive); sem data = saldo atual. */
// Soma no banco (cash_balance, 0014): somar as linhas aqui pararia no limite de 1000 do PostgREST.
export async function getBalance(untilDate?: string): Promise<number> {
  const total = unwrap(await getSupabase().rpc("cash_balance", { p_until: untilDate ?? null }));
  return Number(total ?? 0);
}

export interface Statement {
  openingCents: number; // saldo no fim do dia anterior a dateFrom
  entries: (CashEntry & { balanceCents: number })[]; // mais recentes primeiro, com o saldo após cada lançamento
  inCents: number;
  outCents: number;
  closingCents: number;
}

export async function getStatement(dateFrom: string, dateTo: string): Promise<Statement> {
  const supabase = getSupabase();
  const [opening, rows, reversals] = await Promise.all([
    getBalance(addDaysToDateStr(dateFrom, -1)),
    fetchAll<Record<string, any>>((from, to) =>
      supabase
        .from("cash_entries")
        .select("*, customer:customers(full_name)")
        .gte("entry_date", dateFrom)
        .lte("entry_date", dateTo)
        .order("entry_date", { ascending: true })
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
    fetchAll<{ reversal_of: string }>((from, to) =>
      supabase.from("cash_entries").select("reversal_of").not("reversal_of", "is", null).order("id").range(from, to)
    ),
  ]);
  const reversedIds = new Set(reversals.map((r) => r.reversal_of));

  let running = opening;
  let inCents = 0;
  let outCents = 0;
  const entries = rows.map((r) => {
    const entry = toCashEntry(r, reversedIds);
    running += signed(entry.direction, entry.amountCents);
    if (entry.direction === "in") inCents += entry.amountCents;
    else outCents += entry.amountCents;
    return { ...entry, balanceCents: running };
  });

  return { openingCents: opening, entries: entries.reverse(), inCents, outCents, closingCents: running };
}

/** Ajuste manual (saldo inicial, sangria, aporte). Uma escrita só — não precisa de RPC. */
export async function addCashAdjustment(input: {
  date: string;
  direction: CashDirection;
  amountCents: number;
  description: string;
  paymentMethod?: PaymentMethod | null;
}) {
  unwrap(
    await getSupabase().from("cash_entries").insert({
      entry_date: input.date,
      direction: input.direction,
      amount_cents: input.amountCents,
      category: "ajuste",
      description: input.description,
      payment_method: input.paymentMethod ?? null,
    })
  );
}

/** Estorna um ajuste lançado errado (o livro-caixa não aceita apagar). */
export async function reverseCashAdjustment(entryId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  const entry = unwrap(await supabase.from("cash_entries").select("*").eq("id", entryId).maybeSingle());
  if (!entry) return { ok: false, error: "Lançamento não encontrado." };
  if (entry.category !== "ajuste") {
    return { ok: false, error: "Só ajustes manuais são estornados aqui. Vendas e contas se corrigem na própria tela." };
  }
  const result = await supabase.from("cash_entries").insert({
    entry_date: todayDateStr(),
    direction: entry.direction === "in" ? "out" : "in",
    amount_cents: entry.amount_cents,
    category: "estorno",
    description: `Estorno: ${entry.description}`,
    payment_method: entry.payment_method,
    reversal_of: entry.id,
  });
  if (result.error?.code === "23505") return { ok: false, error: "Este ajuste já foi estornado." };
  unwrap(result);
  return { ok: true };
}

export interface DashboardFinance {
  balanceCents: number;
  todayInCents: number;
  monthInCents: number;
  monthOutCents: number;
  receivableCents: number;
  receivableCount: number;
  payableDueCents: number; // em aberto com vencimento até 7 dias (inclui atrasadas)
  payableDueCount: number;
  overduePayables: number;
}

export async function getDashboardFinance(payableDueDays = 7): Promise<DashboardFinance> {
  const supabase = getSupabase();
  const today = todayDateStr();
  const monthStart = `${today.slice(0, 7)}-01`;
  const [balanceCents, month, open, payables] = await Promise.all([
    getBalance(),
    fetchAll<{ direction: CashDirection; amount_cents: number; entry_date: string }>((from, to) =>
      supabase.from("cash_entries").select("direction, amount_cents, entry_date").gte("entry_date", monthStart).order("id").range(from, to)
    ),
    supabase.from("sales").select("total_cents, paid_cents").eq("status", "open"),
    supabase
      .from("payables")
      .select("amount_cents, due_date")
      .eq("status", "open")
      .lte("due_date", addDaysToDateStr(today, payableDueDays)),
  ]);

  let todayInCents = 0;
  let monthInCents = 0;
  let monthOutCents = 0;
  for (const e of month) {
    if (e.direction === "in") {
      monthInCents += e.amount_cents;
      if (e.entry_date === today) todayInCents += e.amount_cents;
    } else {
      monthOutCents += e.amount_cents;
    }
  }
  const openSales = unwrap(open);
  const duePayables = unwrap(payables);

  return {
    balanceCents,
    todayInCents,
    monthInCents,
    monthOutCents,
    receivableCents: openSales.reduce((s, r) => s + r.total_cents - r.paid_cents, 0),
    receivableCount: openSales.length,
    payableDueCents: duePayables.reduce((s, r) => s + r.amount_cents, 0),
    payableDueCount: duePayables.length,
    overduePayables: duePayables.filter((r) => r.due_date < today).length,
  };
}
