import { addDaysToDateStr, todayDateStr } from "@/lib/utils/date-format";
import { db, insertRow, updateRow, type PgError } from "@/lib/demo/client";
import type { Row } from "@/lib/demo/seed";

/**
 * As RPCs de supabase/migrations (0006, 0012, 0014) refeitas em TS para o modo
 * demonstração. Mesmas validações e mensagens; sem concorrência (um processo só).
 * Se uma RPC real mudar, esta cópia não acompanha sozinha — é só para demo.
 */

type Json = Record<string, any>;
const fail = (error: string) => ({ ok: false, error });
const now = () => new Date().toISOString();

function must<T>(result: { row?: T; error?: PgError }): T {
  if (result.error) throw new Error(result.error.message);
  return result.row as T;
}
function mustUpdate(table: string, row: Row, patch: Row) {
  const error = updateRow(table, row, patch);
  if (error) throw new Error(error.message);
}

const find = (table: string, id: unknown) => db()[table].find((r) => r.id === id);
const isReversed = (entry: Row) => db().cash_entries.some((r) => r.reversal_of === entry.id);

function receiptAlreadyUsed(txid: string | null) {
  return !!txid && db().cash_entries.some((e) => e.receipt_txid === txid && !isReversed(e));
}

function itemsDescription(saleId: string) {
  const names = db().sale_items.filter((i) => i.sale_id === saleId).map((i) => i.description);
  return names.length ? names.join(", ") : null;
}

const formatReais = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

function cashBalance({ p_until }: Json) {
  return db()
    .cash_entries.filter((e) => !p_until || e.entry_date <= p_until)
    .reduce((sum, e) => sum + (e.direction === "in" ? e.amount_cents : -e.amount_cents), 0);
}

function generateRecurringPayables({ p_month }: Json) {
  const first = `${String(p_month).slice(0, 7)}-01`;
  const last = addDaysToDateStr(`${addDaysToDateStr(first, 32).slice(0, 7)}-01`, -1);
  const lastDay = Number(last.slice(8, 10));
  let count = 0;
  for (const bill of db().recurring_bills) {
    if (!bill.is_active || bill.starts_on > last) continue;
    if (db().payables.some((p) => p.recurring_bill_id === bill.id && p.competence === first)) continue;
    must(
      insertRow("payables", {
        description: bill.description,
        category: bill.category,
        supplier: bill.supplier,
        amount_cents: bill.amount_cents,
        due_date: `${first.slice(0, 8)}${String(Math.min(bill.due_day, lastDay)).padStart(2, "0")}`,
        recurring_bill_id: bill.id,
        competence: first,
      })
    );
    count++;
  }
  return count;
}

function replaceBusinessHours({ p_weekday, p_ranges }: Json) {
  const tables = db();
  tables.business_hours = tables.business_hours.filter((r) => r.weekday !== p_weekday);
  for (const r of p_ranges ?? []) {
    must(insertRow("business_hours", { weekday: p_weekday, start_time: r.startTime, end_time: r.endTime, is_active: true }));
  }
  return null;
}

function replaceServiceProducts({ p_service_id, p_lines }: Json) {
  const tables = db();
  tables.service_products = tables.service_products.filter((r) => r.service_id !== p_service_id);
  for (const l of p_lines ?? []) {
    must(insertRow("service_products", { service_id: p_service_id, product_id: l.productId, quantity: l.quantity }));
  }
  return null;
}

function upsertSpecialHours({ p_date, p_is_closed, p_reason, p_ranges }: Json) {
  const tables = db();
  let row = tables.special_hours.find((r) => r.special_date === p_date);
  if (row) mustUpdate("special_hours", row, { is_closed: p_is_closed, reason: p_reason });
  else row = must(insertRow("special_hours", { special_date: p_date, is_closed: p_is_closed, reason: p_reason }));
  tables.special_hours_ranges = tables.special_hours_ranges.filter((r) => r.special_hours_id !== row!.id);
  if (!p_is_closed) {
    for (const r of p_ranges ?? []) {
      must(insertRow("special_hours_ranges", { special_hours_id: row.id, start_time: r.startTime, end_time: r.endTime }));
    }
  }
  return row.id;
}

function registerSale({ p }: Json) {
  const items: Json[] = p?.items ?? [];
  const discount = Number(p?.discountCents ?? 0);
  let customerId: string | null = p?.customerId || null;
  const apptId: string | null = p?.appointmentId || null;
  const date: string = p?.saleDate || todayDateStr();
  const method: string | null = p?.payment?.method || null;
  const txid: string | null = (p?.payment?.receiptTxid ?? "").trim() || null;

  if (!items.length) return fail("Adicione ao menos um item.");
  if (discount < 0) return fail("Desconto inválido.");
  let appointment: Row | undefined;
  if (apptId) {
    appointment = find("appointments", apptId);
    if (!appointment) return fail("Agendamento não encontrado.");
    if (!["CONFIRMED", "COMPLETED"].includes(appointment.status)) {
      return fail("Só é possível vender em atendimentos confirmados ou concluídos.");
    }
    customerId = appointment.customer_id;
  }
  if (receiptAlreadyUsed(txid)) return fail("Este comprovante já foi registrado.");

  // 1ª passada: valida tudo (estoque inclusive) antes de qualquer escrita.
  const lines: { type: string; qty: number; price: number; desc: string; ref: Row | null }[] = [];
  let subtotal = 0;
  for (const item of items) {
    const qty = Number(item.quantity ?? 1);
    if (qty <= 0) return fail("Quantidade inválida.");
    let price: number | null;
    let desc: string;
    let ref: Row | null = null;
    if (item.type === "product") {
      ref = find("products", item.productId) ?? null;
      if (!ref) return fail("Produto não encontrado.");
      const wanted = items
        .filter((i) => i.type === "product" && i.productId === item.productId)
        .reduce((s, i) => s + Number(i.quantity ?? 1), 0);
      if (ref.stock_quantity < wanted) return fail(`Estoque insuficiente para "${ref.name}" (restam ${ref.stock_quantity}).`);
      price = item.unitPriceCents ?? ref.price_cents;
      desc = ref.name;
    } else if (item.type === "service") {
      ref = find("services", item.serviceId) ?? null;
      if (!ref) return fail("Serviço não encontrado.");
      price = item.unitPriceCents ?? ref.price_cents;
      if (price == null) return fail(`Informe o valor de "${ref.name}".`);
      desc = ref.name;
    } else if (item.type === "custom") {
      desc = String(item.description ?? "").trim();
      if (!desc) return fail("Descreva o item avulso.");
      price = item.unitPriceCents ?? null;
    } else {
      return fail("Item inválido.");
    }
    if (price == null || price < 0) return fail("Valor inválido.");
    subtotal += price * qty;
    lines.push({ type: item.type, qty, price, desc, ref });
  }
  if (discount > subtotal) return fail("O desconto é maior que o valor da venda.");
  const total = subtotal - discount;
  let paid = 0;
  if (p?.payment && typeof p.payment === "object") {
    paid = Number(p.payment.amountCents ?? 0);
    if (paid < 0 || paid > total) return fail("O valor pago não pode passar do total.");
    if (paid > 0 && !method) return fail("Informe a forma de pagamento.");
  }
  const status = paid >= total ? "paid" : "open";

  const sale = must(
    insertRow("sales", {
      appointment_id: apptId,
      customer_id: customerId,
      total_cents: total,
      discount_cents: discount,
      paid_cents: paid,
      payment_method: paid > 0 ? method : null,
      notes: String(p?.notes ?? "").trim() || null,
      status,
      sale_date: date,
      due_date: status === "open" ? p?.dueDate || date : null,
      paid_at: status === "paid" ? now() : null,
    })
  );
  for (const line of lines) {
    if (line.type === "product" && line.ref) mustUpdate("products", line.ref, { stock_quantity: line.ref.stock_quantity - line.qty });
    must(
      insertRow("sale_items", {
        sale_id: sale.id,
        item_type: line.type === "product" ? "product" : "service",
        ref_id: line.ref?.id ?? null,
        description: line.desc,
        unit_price_cents: line.price,
        quantity: line.qty,
        total_cents: line.price * line.qty,
      })
    );
  }
  if (paid > 0) {
    must(
      insertRow("cash_entries", {
        entry_date: date,
        direction: "in",
        amount_cents: paid,
        category: "venda",
        description: itemsDescription(sale.id) ?? "Venda",
        payment_method: method,
        sale_id: sale.id,
        customer_id: customerId,
        receipt_txid: txid,
      })
    );
  }
  if (appointment?.status === "CONFIRMED") mustUpdate("appointments", appointment, { status: "COMPLETED" });
  return { ok: true, saleId: sale.id };
}

function receiveSalePayment({ p_sale_id, p_amount_cents, p_method, p_date, p_receipt_txid }: Json) {
  const sale = find("sales", p_sale_id);
  const txid = String(p_receipt_txid ?? "").trim() || null;
  if (!sale) return fail("Venda não encontrada.");
  if (sale.status !== "open") return fail("Esta venda não está em aberto.");
  const remaining = sale.total_cents - sale.paid_cents;
  if (!p_amount_cents || p_amount_cents <= 0 || p_amount_cents > remaining) {
    return fail(`O valor deve ser entre R$ 0,01 e o que falta (R$ ${formatReais(remaining)}).`);
  }
  if (!p_method) return fail("Informe a forma de pagamento.");
  if (receiptAlreadyUsed(txid)) return fail("Este comprovante já foi registrado.");
  must(
    insertRow("cash_entries", {
      entry_date: p_date || todayDateStr(),
      direction: "in",
      amount_cents: p_amount_cents,
      category: "recebimento",
      description: `Recebimento: ${itemsDescription(sale.id) ?? "venda"}`,
      payment_method: p_method,
      sale_id: sale.id,
      customer_id: sale.customer_id,
      receipt_txid: txid,
    })
  );
  const paid = sale.paid_cents + p_amount_cents;
  mustUpdate("sales", sale, {
    paid_cents: paid,
    payment_method: p_method,
    status: paid >= sale.total_cents ? "paid" : "open",
    paid_at: paid >= sale.total_cents ? now() : null,
  });
  return { ok: true };
}

/** Estorna os lançamentos ainda não estornados; `link` amarra o estorno à venda ou à conta. */
function reverseEntries(filter: (e: Row) => boolean, link: Row, copyCustomer: boolean) {
  const open = db().cash_entries.filter((e) => filter(e) && e.reversal_of == null && !isReversed(e));
  for (const entry of open) {
    must(
      insertRow("cash_entries", {
        entry_date: todayDateStr(),
        direction: entry.direction === "in" ? "out" : "in",
        amount_cents: entry.amount_cents,
        category: "estorno",
        description: `Estorno: ${entry.description}`,
        payment_method: entry.payment_method,
        reversal_of: entry.id,
        ...link,
        ...(copyCustomer ? { customer_id: entry.customer_id } : {}),
      })
    );
  }
}

function cancelSale({ p_sale_id, p_reason }: Json) {
  const sale = find("sales", p_sale_id);
  if (!sale) return fail("Venda não encontrada.");
  if (sale.status === "cancelled") return fail("Esta venda já foi cancelada.");
  for (const item of db().sale_items.filter((i) => i.sale_id === sale.id && i.item_type === "product")) {
    const product = find("products", item.ref_id);
    if (product) mustUpdate("products", product, { stock_quantity: product.stock_quantity + item.quantity });
  }
  reverseEntries((e) => e.sale_id === sale.id, { sale_id: sale.id }, true);
  const reason = String(p_reason ?? "").trim();
  mustUpdate("sales", sale, {
    status: "cancelled",
    cancelled_at: now(),
    notes: reason ? [sale.notes, `Cancelada: ${reason}`].filter(Boolean).join("\n") : sale.notes,
  });
  return { ok: true };
}

function payPayable({ p_payable_id, p_amount_cents, p_method, p_date }: Json) {
  const payable = find("payables", p_payable_id);
  if (!payable) return fail("Conta não encontrada.");
  if (payable.status !== "open") return fail("Esta conta não está em aberto.");
  if (!p_amount_cents || p_amount_cents <= 0) return fail("Informe o valor pago.");
  const date = p_date || todayDateStr();
  mustUpdate("payables", payable, { status: "paid", amount_cents: p_amount_cents, payment_method: p_method, paid_on: date });
  must(
    insertRow("cash_entries", {
      entry_date: date,
      direction: "out",
      amount_cents: p_amount_cents,
      category: payable.purchase_id ? "compra" : "conta",
      description: payable.description,
      payment_method: p_method,
      payable_id: payable.id,
    })
  );
  return { ok: true };
}

function undoPayablePayment({ p_payable_id }: Json) {
  const payable = find("payables", p_payable_id);
  if (!payable || payable.status !== "paid") return fail("Esta conta não está paga.");
  reverseEntries((e) => e.payable_id === payable.id, { payable_id: payable.id }, false);
  mustUpdate("payables", payable, { status: "open", paid_on: null, payment_method: null });
  return { ok: true };
}

function registerPurchase({ p }: Json) {
  const items: Json[] = p?.items ?? [];
  const date: string = p?.purchaseDate || todayDateStr();
  const supplier: string | null = String(p?.supplier ?? "").trim() || null;
  if (!items.length) return fail("Adicione ao menos um item.");
  let total = 0;
  for (const item of items) {
    const qty = Number(item.quantity);
    const cost = Number(item.unitCostCents);
    if (!qty || qty <= 0 || Number.isNaN(cost) || cost < 0) return fail("Quantidade ou custo inválido.");
    if (!item.productId && !String(item.description ?? "").trim()) return fail("Descreva o item comprado.");
    if (item.productId && !find("products", item.productId)) throw new Error("Produto não encontrado.");
    total += qty * cost;
  }
  const purchase = must(insertRow("purchases", { supplier, purchase_date: date, total_cents: total, notes: String(p?.notes ?? "").trim() || null }));
  for (const item of items) {
    const qty = Number(item.quantity);
    const cost = Number(item.unitCostCents);
    let desc = String(item.description ?? "").trim() || null;
    if (item.productId) {
      const product = find("products", item.productId)!;
      mustUpdate("products", product, { stock_quantity: product.stock_quantity + qty, cost_cents: cost });
      desc = product.name;
    }
    must(
      insertRow("purchase_items", {
        purchase_id: purchase.id,
        product_id: item.productId || null,
        description: desc,
        quantity: qty,
        unit_cost_cents: cost,
        total_cents: qty * cost,
      })
    );
  }
  const payable = must(
    insertRow("payables", {
      description: `Compra${supplier ? ` — ${supplier}` : ""}`,
      category: "compra",
      supplier,
      amount_cents: total,
      due_date: p?.dueDate || date,
      purchase_id: purchase.id,
    })
  );
  if (p?.paidNow && total > 0) payPayable({ p_payable_id: payable.id, p_amount_cents: total, p_method: p?.method || null, p_date: date });
  return { ok: true, purchaseId: purchase.id };
}

const RPCS: Record<string, (args: Json) => unknown> = {
  cash_balance: cashBalance,
  generate_recurring_payables: generateRecurringPayables,
  replace_business_hours: replaceBusinessHours,
  upsert_special_hours: upsertSpecialHours,
  register_sale: registerSale,
  receive_sale_payment: receiveSalePayment,
  cancel_sale: cancelSale,
  pay_payable: payPayable,
  undo_payable_payment: undoPayablePayment,
  register_purchase: registerPurchase,
  replace_service_products: replaceServiceProducts,
};

export function runRpc(name: string, args: Json): unknown {
  const fn = RPCS[name];
  if (!fn) throw new Error(`A função "${name}" não existe no modo demonstração.`);
  return fn(args);
}
