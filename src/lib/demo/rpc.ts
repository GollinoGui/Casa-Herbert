import { addDaysToDateStr, addMinutesToTime, todayDateStr } from "@/lib/utils/date-format";
import { consumeServiceProducts, db, insertRow, resolveCommissionBps, updateRow, type PgError } from "@/lib/demo/client";
import type { Row } from "@/lib/demo/seed";

/**
 * As RPCs de supabase/migrations (0006, 0012, 0014, 0017, 0018, 0019) refeitas em TS para o modo
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
  const saleProf: string | null = p?.professionalId || appointment?.professional_id || null;
  const knownProf = (id: unknown) => !id || !!find("professionals", id);
  if (!knownProf(saleProf) || items.some((i) => !knownProf(i.professionalId))) return fail("Profissional não encontrado.");
  const pkgService = appointment?.customer_package_id ? appointment.service_id : null;
  if (receiptAlreadyUsed(txid)) return fail("Este comprovante já foi registrado.");

  // 1ª passada: valida tudo (estoque inclusive) antes de qualquer escrita.
  const lines: { type: string; qty: number; price: number; desc: string; ref: Row | null; item: Json }[] = [];
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
    lines.push({ type: item.type, qty, price, desc, ref, item });
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
      professional_id: saleProf,
    })
  );
  let allocated = 0;
  lines.forEach((line, index) => {
    // Rateio do desconto; o último item leva o resto do arredondamento.
    const net =
      index === lines.length - 1 ? total - allocated : subtotal === 0 ? 0 : Math.round((line.price * line.qty * total) / subtotal);
    allocated += net;
    const itemType = line.type === "product" ? "product" : "service";
    const prof: string | null = line.item.professionalId || saleProf;
    const brandId = line.type === "product" ? line.ref?.brand_id ?? null : null;
    const commission =
      !prof || line.item.noCommission || (line.type === "service" && pkgService && line.ref?.id === pkgService)
        ? 0
        : Math.round((net * resolveCommissionBps(prof, itemType, line.ref?.id ?? null, brandId)) / 10000);
    const brand = brandId ? find("brands", brandId) : undefined;
    const consigned = !!brand?.is_consigned;
    const brandDue = consigned ? net - Math.round((net * Number(brand!.commission_bps)) / 10000) : 0;
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
        professional_id: prof,
        commission_cents: commission,
        brand_id: consigned ? brandId : null,
        brand_due_cents: brandDue,
        net_cents: net,
      })
    );
  });
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
  const pkg = db().customer_packages.find((cp) => cp.sale_id === sale.id);
  if (pkg) {
    if (sessionCounts(pkg.id).used > 0) {
      return fail(
        "Este pacote já tem sessões usadas e não pode ser cancelado. Para devolver parte do valor, lance um ajuste de saída em Saldo e extrato."
      );
    }
    for (const appt of linkedAppointments(pkg.id).filter((a) => a.status === "PENDING" || a.status === "CONFIRMED")) {
      mustUpdate("appointments", appt, { status: "CANCELLED", cancelled_at: now(), package_outcome: "returned" });
    }
    mustUpdate("customer_packages", pkg, { status: "cancelled" });
  }
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

const linkedAppointments = (packageId: unknown) => db().appointments.filter((a) => a.customer_package_id === packageId);

/** Espelho de package_session_counts (0018). */
function sessionCounts(packageId: unknown) {
  const linked = linkedAppointments(packageId);
  return {
    used: linked.filter((a) => a.status === "COMPLETED" || (a.status === "CANCELLED" && a.package_outcome === "counted")).length,
    reserved: linked.filter((a) => a.status === "PENDING" || a.status === "CONFIRMED").length,
  };
}

/** Espelho de refresh_customer_package_status (0018). */
function refreshPackageStatus(pkg: Row | undefined) {
  if (!pkg || pkg.status === "cancelled") return;
  const status = sessionCounts(pkg.id).used >= pkg.sessions_total ? "finished" : "active";
  if (pkg.status !== status) mustUpdate("customer_packages", pkg, { status });
}

const ddmm = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/** Erro de constraint vira erro da RPC com o código do Postgres (o client.rpc repassa). */
function throwPg(error: PgError): never {
  throw Object.assign(new Error(error.message), { pgError: error });
}

/** Espelho de sell_package (0019). */
function sellPackage({ p }: Json) {
  const customerId: string | null = p?.customerId || null;
  if (!customerId || !find("customers", customerId)) return fail("Escolha a cliente do pacote.");
  const pkg = find("service_packages", p?.packageId);
  if (!pkg || !pkg.is_active) return fail("Pacote não encontrado.");
  const discount = Number(p?.discountCents ?? 0);
  const date: string = p?.saleDate || todayDateStr();
  const result = registerSale({
    p: {
      customerId,
      saleDate: date,
      dueDate: p?.dueDate || undefined,
      discountCents: discount,
      notes: p?.notes,
      professionalId: p?.professionalId || undefined,
      items: [
        { type: "custom", description: `Pacote: ${pkg.name} (${pkg.sessions} sessões)`, unitPriceCents: pkg.price_cents, noCommission: true },
      ],
      payment: p?.payment ?? undefined,
    },
  }) as Json;
  if (!result.ok) return result;
  const cp = must(
    insertRow("customer_packages", {
      customer_id: customerId,
      service_id: pkg.service_id,
      package_id: pkg.id,
      name: pkg.name,
      sessions_total: pkg.sessions,
      session_value_cents: Math.round((pkg.price_cents - discount) / pkg.sessions),
      sale_id: result.saleId,
      expires_on: pkg.valid_days ? addDaysToDateStr(date, pkg.valid_days) : null,
    })
  );
  return { ok: true, saleId: result.saleId, customerPackageId: cp.id };
}

/** Espelho de use_package_session (0018). */
function consumePackageSession({ p_appointment_id, p_customer_package_id }: Json) {
  const appt = find("appointments", p_appointment_id);
  if (!appt) return fail("Agendamento não encontrado.");
  if (appt.status !== "CONFIRMED") return fail("Só dá para usar o pacote em um atendimento confirmado.");
  if (appt.appointment_date > todayDateStr()) {
    return fail("A sessão só é concluída no dia do atendimento. Até lá ela fica reservada no pacote.");
  }
  if (appt.customer_package_id && appt.customer_package_id !== p_customer_package_id) return fail("Este atendimento é de outro pacote.");
  const pkg = find("customer_packages", p_customer_package_id);
  if (!pkg || pkg.customer_id !== appt.customer_id) return fail("Pacote não encontrado para esta cliente.");
  if (pkg.status !== "active") return fail("Este pacote não está ativo.");
  if (pkg.service_id !== appt.service_id) return fail("O pacote é de outro serviço.");
  if (pkg.expires_on && appt.appointment_date > pkg.expires_on) return fail("O pacote venceu antes da data deste atendimento.");
  const { used, reserved } = sessionCounts(pkg.id);
  if (!appt.customer_package_id && used + reserved >= pkg.sessions_total) return fail("Não sobra sessão livre neste pacote.");
  mustUpdate("appointments", appt, { customer_package_id: pkg.id, status: "COMPLETED" });
  refreshPackageStatus(pkg);
  return { ok: true, remaining: pkg.sessions_total - used - 1 };
}

/** Espelho de schedule_package_sessions (0018): tudo ou nada. */
function schedulePackageSessions({ p }: Json) {
  const pkg = find("customer_packages", p?.customerPackageId);
  if (!pkg) return fail("Pacote não encontrado.");
  if (pkg.status !== "active") return fail("Este pacote não está em andamento.");
  const sessions: { date: string; startTime: string }[] = Array.isArray(p?.sessions) ? p.sessions : [];
  if (!sessions.length) return fail("Escolha ao menos uma data.");
  const { used, reserved } = sessionCounts(pkg.id);
  if (used + reserved + sessions.length > pkg.sessions_total) {
    return fail(`O pacote só tem ${Math.max(pkg.sessions_total - used - reserved, 0)} sessão(ões) livre(s) para agendar.`);
  }
  const service = find("services", pkg.service_id);
  const today = todayDateStr();
  for (const s of sessions) {
    if (s.date < today) return fail(`A data ${ddmm(s.date)} já passou.`);
    if (pkg.expires_on && s.date > pkg.expires_on) {
      return fail(`O pacote vale até ${ddmm(pkg.expires_on)}: a data ${ddmm(s.date)} passa disso.`);
    }
  }
  const created: Row[] = [];
  for (const s of sessions) {
    const result = insertRow("appointments", {
      customer_id: pkg.customer_id,
      service_id: pkg.service_id,
      appointment_date: s.date,
      start_time: s.startTime,
      end_time: addMinutesToTime(s.startTime, service?.duration_minutes ?? 60),
      status: "CONFIRMED",
      price_cents: pkg.session_value_cents,
      professional_id: p?.professionalId || null,
      confirmed_at: now(),
      customer_package_id: pkg.id,
    });
    if (result.error) {
      const rows = db().appointments;
      for (const row of created) rows.splice(rows.indexOf(row), 1);
      throwPg(result.error);
    }
    created.push(result.row!);
  }
  return { ok: true, appointmentIds: created.map((r) => r.id) };
}

/** Espelho de mark_appointment_messages (0022). */
function markAppointmentMessages({ p_appointment_id, p_rule_ids, p_sent }: Json) {
  const row = find("appointments", p_appointment_id);
  const ids: string[] = Array.isArray(p_rule_ids) ? p_rule_ids : [];
  if (!row || !ids.length) return null;
  const sent: Record<string, string> = { ...(row.messages_sent ?? {}) };
  for (const id of ids) {
    if (p_sent) sent[id] = now();
    else delete sent[id];
  }
  mustUpdate("appointments", row, { messages_sent: sent });
  return null;
}

/** Espelho de record_past_package_session (0021): sessão já feita entra concluída. */
function recordPastPackageSession({ p }: Json) {
  const pkg = find("customer_packages", p?.customerPackageId);
  if (!pkg) return fail("Pacote não encontrado.");
  if (pkg.status !== "active") return fail("Este pacote não está em andamento.");
  const date = String(p?.date ?? "");
  const startTime = String(p?.startTime ?? "");
  if (!date || !startTime) return fail("Informe a data e o horário da sessão.");
  if (date > todayDateStr()) return fail('Essa data ainda não chegou. Para sessão futura, use "Agendar sessões".');
  if (pkg.expires_on && date > pkg.expires_on) {
    return fail(`O pacote vale até ${ddmm(pkg.expires_on)}: a data ${ddmm(date)} passa disso.`);
  }
  const { used, reserved } = sessionCounts(pkg.id);
  if (used + reserved >= pkg.sessions_total) {
    return fail("Não sobra sessão livre neste pacote. Se a sessão já estava agendada, abra ela na agenda e conclua por lá.");
  }
  const service = find("services", pkg.service_id);
  const professionalId =
    p?.professionalId ||
    db()
      .professionals.filter((r) => r.is_active)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))[0]?.id ||
    null;
  const notes = String(p?.notes ?? "").trim();
  const appt = must(
    insertRow("appointments", {
      customer_id: pkg.customer_id,
      service_id: pkg.service_id,
      appointment_date: date,
      start_time: startTime,
      end_time: addMinutesToTime(startTime, service?.duration_minutes ?? 60),
      status: "COMPLETED",
      price_cents: pkg.session_value_cents,
      professional_id: professionalId,
      confirmed_at: now(),
      customer_package_id: pkg.id,
      admin_notes: ["Sessão registrada depois de feita.", notes].filter(Boolean).join("\n"),
      commission_cents: Math.round(
        (Number(pkg.session_value_cents) * resolveCommissionBps(professionalId, "service", pkg.service_id, null)) / 10000
      ),
    })
  );
  if (p?.consumeStock === true) consumeServiceProducts(pkg.service_id);
  refreshPackageStatus(pkg);
  return { ok: true, appointmentId: appt.id, remaining: pkg.sessions_total - used - 1 };
}

/** Espelho de cancel_package_session (0018). */
function cancelPackageSession({ p_appointment_id, p_outcome, p_no_show, p_reason }: Json) {
  if (p_outcome !== "counted" && p_outcome !== "returned") return fail("Escolha se a sessão conta ou volta para o pacote.");
  const appt = find("appointments", p_appointment_id);
  if (!appt || !appt.customer_package_id) return fail("Sessão de pacote não encontrada.");
  const pkg = find("customer_packages", appt.customer_package_id);
  if (appt.status === "CANCELLED") {
    if (appt.package_outcome === p_outcome) return { ok: true };
    if (p_outcome === "counted" && pkg) {
      const { used, reserved } = sessionCounts(pkg.id);
      if (used + reserved >= pkg.sessions_total) {
        return fail("Não sobra sessão para descontar: a vaga já foi usada numa reposição. Desmarque a reposição antes.");
      }
    }
    mustUpdate("appointments", appt, { package_outcome: p_outcome });
  } else if (appt.status === "PENDING" || appt.status === "CONFIRMED") {
    const reason = String(p_reason ?? "").trim();
    mustUpdate("appointments", appt, {
      status: "CANCELLED",
      cancelled_at: now(),
      package_outcome: p_outcome,
      no_show: !!p_no_show,
      admin_notes: reason ? [appt.admin_notes, reason].filter(Boolean).join("\n") : appt.admin_notes,
    });
  } else {
    return fail("Só dá para desmarcar uma sessão que ainda vai acontecer.");
  }
  refreshPackageStatus(pkg);
  return { ok: true };
}

/** Espelho de reopen_package_session (0018), devolvendo a receita ao estoque. */
function reopenPackageSession({ p_appointment_id }: Json) {
  const appt = find("appointments", p_appointment_id);
  if (!appt || !appt.customer_package_id || appt.status !== "COMPLETED") return fail("Só dá para reabrir uma sessão de pacote concluída.");
  if (appt.appointment_date <= todayDateStr()) return fail("Esta sessão já aconteceu.");
  if (db().sales.some((s) => s.appointment_id === appt.id && s.status !== "cancelled")) {
    return fail("Este atendimento tem venda ligada: cancele a venda antes.");
  }
  const error = updateRow("appointments", appt, { status: "CONFIRMED" });
  if (error) throwPg(error);
  for (const line of db().service_products.filter((l) => l.service_id === appt.service_id)) {
    const product = find("products", line.product_id);
    if (!product) continue;
    const usage = Math.round((Number(product.open_usage ?? 0) - Number(line.quantity)) * 1000) / 1000;
    const units = Math.max(Math.ceil(-usage), 0);
    product.stock_quantity += units;
    product.open_usage = Math.round((usage + units) * 1000) / 1000;
  }
  refreshPackageStatus(find("customer_packages", appt.customer_package_id));
  return { ok: true };
}

const time = (iso: unknown) => Date.parse(String(iso));

/** Espelho de cash_drawer_preview (0017). */
function cashDrawerPreview({ p_opening_cents }: Json) {
  const prev = [...db().cash_closings].sort((a, b) => time(b.created_at) - time(a.created_at))[0];
  const today = todayDateStr();
  const opening = prev ? prev.counted_cents - prev.withdrawn_cents : Math.max(Number(p_opening_cents ?? 0), 0);
  const moves = db().cash_entries.filter(
    (e) => e.payment_method === "dinheiro" && (prev ? time(e.created_at) > time(prev.created_at) : e.entry_date === today)
  );
  const cashIn = moves.filter((e) => e.direction === "in").reduce((sum, e) => sum + e.amount_cents, 0);
  const cashOut = moves.filter((e) => e.direction === "out").reduce((sum, e) => sum + e.amount_cents, 0);
  return {
    firstClosing: !prev,
    previousAt: prev?.created_at ?? null,
    openingCents: opening,
    cashInCents: cashIn,
    cashOutCents: cashOut,
    expectedCents: opening + cashIn - cashOut,
  };
}

/** Espelho de close_cash_drawer (0017). */
function closeCashDrawer({ p }: Json) {
  const counted = p?.countedCents;
  const withdrawn = Number(p?.withdrawnCents ?? 0);
  if (counted == null || counted < 0) return fail("Informe quanto tem na gaveta.");
  if (withdrawn < 0 || withdrawn > counted) return fail("A retirada não pode passar do que foi contado.");
  const preview = cashDrawerPreview({ p_opening_cents: p?.openingCents ?? 0 });
  const diff = counted - preview.expectedCents;
  // O fechamento e o ajuste nascem no mesmo instante, como no Postgres (now() da transação).
  const stamp = now();
  let entryId: string | null = null;
  if (p?.postDifference && diff !== 0) {
    entryId = must(
      insertRow("cash_entries", {
        entry_date: todayDateStr(),
        direction: diff > 0 ? "in" : "out",
        amount_cents: Math.abs(diff),
        category: "ajuste",
        description: diff > 0 ? "Sobra no fechamento do caixa" : "Falta no fechamento do caixa",
        payment_method: "dinheiro",
        created_at: stamp,
      })
    ).id;
  }
  const closing = must(
    insertRow("cash_closings", {
      closing_date: todayDateStr(),
      opening_cents: preview.openingCents,
      cash_in_cents: preview.cashInCents,
      cash_out_cents: preview.cashOutCents,
      expected_cents: preview.expectedCents,
      counted_cents: counted,
      withdrawn_cents: withdrawn,
      difference_cents: diff,
      adjustment_entry_id: entryId,
      notes: String(p?.notes ?? "").trim() || null,
      created_at: stamp,
    })
  );
  return { ok: true, closingId: closing.id, differenceCents: diff };
}

/** Espelho de commission_lines (0019): devido = cheio × fração recebida, arredondado sobre o acumulado. */
function commissionLines({ p_until }: Json) {
  const until = String(p_until);
  const ratio = (saleId: unknown) => {
    const sale = find("sales", saleId);
    if (!sale) return 0;
    if (sale.total_cents === 0) return 1;
    const net = db()
      .cash_entries.filter((e) => e.sale_id === saleId && e.entry_date <= until)
      .reduce((s, e) => s + (e.direction === "in" ? e.amount_cents : -e.amount_cents), 0);
    return Math.min(Math.max(net, 0), sale.total_cents) / sale.total_cents;
  };
  const groups = new Map<string, Json>();
  for (const item of db().sale_items) {
    const sale = find("sales", item.sale_id);
    if (!sale || sale.sale_date > until) continue;
    const parts: [string, unknown, number][] = [
      ["professional", item.professional_id, Number(item.commission_cents ?? 0)],
      ["brand", item.brand_id, Number(item.brand_due_cents ?? 0)],
    ];
    for (const [kind, refId, cents] of parts) {
      if (!refId || cents <= 0) continue;
      const key = `${kind}:${refId}:${sale.id}`;
      const g = groups.get(key) ?? {
        kind, ref_id: refId, sale_id: sale.id, appointment_id: null, line_date: sale.sale_date, names: [], base_cents: 0, full_cents: 0,
      };
      g.names.push(item.description);
      g.base_cents += Number(item.net_cents ?? item.total_cents);
      g.full_cents += cents;
      groups.set(key, g);
    }
  }
  const rows: Json[] = [...groups.values()].map(({ names, ...g }) => ({
    ...g,
    description: names.join(", "),
    earned_base_cents: Math.round(g.base_cents * ratio(g.sale_id)),
    earned_cents: Math.round(g.full_cents * ratio(g.sale_id)),
  }));
  for (const a of db().appointments) {
    if (a.status !== "COMPLETED" || !a.customer_package_id || !a.professional_id || !(a.commission_cents > 0)) continue;
    if (a.appointment_date > until) continue;
    const cp = find("customer_packages", a.customer_package_id);
    if (!cp) continue;
    rows.push({
      kind: "professional",
      ref_id: a.professional_id,
      sale_id: cp.sale_id,
      appointment_id: a.id,
      line_date: a.appointment_date,
      description: `Sessão: ${cp.name}`,
      base_cents: cp.session_value_cents,
      earned_base_cents: Math.round(cp.session_value_cents * ratio(cp.sale_id)),
      full_cents: a.commission_cents,
      earned_cents: Math.round(a.commission_cents * ratio(cp.sale_id)),
    });
  }
  return rows;
}

/** Espelho de commission_balances (0019). */
function commissionBalances({ p_until }: Json) {
  const until = String(p_until);
  const acc = new Map<string, Json>();
  const get = (kind: string, refId: unknown) => {
    const key = `${kind}:${refId}`;
    if (!acc.has(key)) acc.set(key, { kind, ref_id: refId, earned_cents: 0, paid_cents: 0 });
    return acc.get(key)!;
  };
  for (const l of commissionLines({ p_until: until })) get(l.kind, l.ref_id).earned_cents += l.earned_cents;
  for (const e of db().cash_entries) {
    if ((!e.professional_id && !e.brand_id) || e.entry_date > until) continue;
    const row = e.professional_id ? get("professional", e.professional_id) : get("brand", e.brand_id);
    row.paid_cents += e.direction === "out" ? e.amount_cents : -e.amount_cents;
  }
  return [...acc.values()];
}

/** Espelho de pay_commission (0019). */
function payCommission({ p }: Json) {
  const kind = p?.kind;
  const target = kind === "professional" ? find("professionals", p?.refId) : kind === "brand" ? find("brands", p?.refId) : undefined;
  if (!target) return fail("Profissional ou marca não encontrado.");
  if (!p?.method) return fail("Informe a forma de pagamento.");
  const owed = commissionBalances({ p_until: todayDateStr() })
    .filter((b) => b.kind === kind && b.ref_id === target.id)
    .reduce((s, b) => s + b.earned_cents - b.paid_cents, 0);
  const amount = Number(p?.amountCents ?? 0);
  if (amount <= 0 || amount > owed) return fail(`O valor deve ser entre R$ 0,01 e o devido (R$ ${formatReais(Math.max(owed, 0))}).`);
  const notes = String(p?.notes ?? "").trim();
  const entry = must(
    insertRow("cash_entries", {
      entry_date: p?.date || todayDateStr(),
      direction: "out",
      amount_cents: amount,
      category: kind === "professional" ? "comissao" : "repasse",
      description: `${kind === "professional" ? "Comissão" : "Repasse"}: ${target.name}${notes ? ` — ${notes}` : ""}`,
      payment_method: p.method,
      professional_id: kind === "professional" ? target.id : null,
      brand_id: kind === "brand" ? target.id : null,
    })
  );
  return { ok: true, entryId: entry.id };
}

/** Espelho de undo_commission_payment (0019). */
function undoCommissionPayment({ p_entry_id }: Json) {
  const entry = find("cash_entries", p_entry_id);
  if (!entry || !["comissao", "repasse"].includes(entry.category)) return fail("Pagamento não encontrado.");
  if (isReversed(entry)) return fail("Este pagamento já foi desfeito.");
  reverseEntries((e) => e.id === entry.id, { professional_id: entry.professional_id, brand_id: entry.brand_id }, false);
  return { ok: true };
}

const RPCS: Record<string, (args: Json) => unknown> = {
  commission_lines: commissionLines,
  commission_balances: commissionBalances,
  pay_commission: payCommission,
  undo_commission_payment: undoCommissionPayment,
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
  sell_package: sellPackage,
  use_package_session: consumePackageSession,
  schedule_package_sessions: schedulePackageSessions,
  record_past_package_session: recordPastPackageSession,
  mark_appointment_messages: markAppointmentMessages,
  cancel_package_session: cancelPackageSession,
  reopen_package_session: reopenPackageSession,
  cash_drawer_preview: cashDrawerPreview,
  close_cash_drawer: closeCashDrawer,
};

export function runRpc(name: string, args: Json): unknown {
  const fn = RPCS[name];
  if (!fn) throw new Error(`A função "${name}" não existe no modo demonstração.`);
  return fn(args);
}
