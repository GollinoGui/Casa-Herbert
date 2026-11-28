import type { PaymentMethod } from "@/types";
import { fetchAll, getSupabase } from "@/lib/supabase/server";

export interface CashSeriesPoint {
  key: string; // "YYYY-MM-DD" ou "YYYY-MM"
  inCents: number;
  outCents: number;
}

export interface CountRow {
  name: string;
  count: number;
  totalCents: number;
}

export interface Report {
  /** Regime de caixa: o que entrou e saiu de verdade (mesma fonte do saldo). Estornos contam no dia do estorno. */
  cash: CashSeriesPoint[];
  groupBy: "day" | "month";
  inCents: number;
  outCents: number;
  services: CountRow[];
  products: CountRow[];
  paymentMethods: { method: PaymentMethod | "outro"; totalCents: number }[];
  salesCount: number;
  averageTicketCents: number;
  /** Atendimentos (concluídos ou confirmados) por dia da semana (0 = domingo) e hora de início: heatmap[dia][hora]. */
  heatmap: number[][];
}

/** Período longo agrupa por mês para o gráfico continuar legível. */
function groupKey(date: string, groupBy: "day" | "month") {
  return groupBy === "day" ? date : date.slice(0, 7);
}

function fillKeys(from: string, to: string, groupBy: "day" | "month"): string[] {
  const keys: string[] = [];
  const cursor = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  while (cursor <= end) {
    const key = groupKey(cursor.toISOString().slice(0, 10), groupBy);
    if (keys[keys.length - 1] !== key) keys.push(key);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

export async function getReport(dateFrom: string, dateTo: string): Promise<Report> {
  const supabase = getSupabase();
  const days = (Date.parse(dateTo) - Date.parse(dateFrom)) / 86_400_000 + 1;
  const groupBy = days > 62 ? "month" : "day";

  // Um ano passa fácil de 1000 lançamentos/vendas: tudo paginado (fetchAll), senão os totais saem cortados.
  const [cashRows, sales, apptRows] = await Promise.all([
    fetchAll<Record<string, any>>((from, to) =>
      supabase
        .from("cash_entries")
        .select("entry_date, direction, amount_cents, payment_method, category, professional_id, brand_id")
        .gte("entry_date", dateFrom)
        .lte("entry_date", dateTo)
        .order("id")
        .range(from, to)
    ),
    fetchAll<Record<string, any>>((from, to) =>
      supabase
        .from("sales")
        .select("id, total_cents, appointment_id, sale_items(item_type, description, quantity, total_cents)")
        .neq("status", "cancelled")
        .gte("sale_date", dateFrom)
        .lte("sale_date", dateTo)
        .order("id")
        .range(from, to)
    ),
    // Atendimento concluído sem venda registrada ("Concluir sem venda") ainda conta como serviço feito.
    // Os confirmados entram só no mapa de horários (procura), não na contagem de serviços feitos.
    fetchAll<Record<string, any>>((from, to) =>
      supabase
        .from("appointments")
        .select("id, status, appointment_date, start_time, service:services(name)")
        .in("status", ["COMPLETED", "CONFIRMED"])
        .gte("appointment_date", dateFrom)
        .lte("appointment_date", dateTo)
        .order("id")
        .range(from, to)
    ),
  ]);

  const series = new Map(fillKeys(dateFrom, dateTo, groupBy).map((k) => [k, { key: k, inCents: 0, outCents: 0 }]));
  const methods = new Map<string, number>();
  let inCents = 0;
  let outCents = 0;
  for (const e of cashRows) {
    const point = series.get(groupKey(e.entry_date, groupBy));
    if (e.direction === "in") {
      inCents += e.amount_cents;
      if (point) point.inCents += e.amount_cents;
      // Desfazer pagamento de comissão/repasse não é recebimento de cliente.
      if (e.category !== "ajuste" && !e.professional_id && !e.brand_id) methods.set(e.payment_method ?? "outro", (methods.get(e.payment_method ?? "outro") ?? 0) + e.amount_cents);
    } else {
      outCents += e.amount_cents;
      if (point) point.outCents += e.amount_cents;
      if (e.category === "estorno") methods.set(e.payment_method ?? "outro", (methods.get(e.payment_method ?? "outro") ?? 0) - e.amount_cents);
    }
  }

  const services = new Map<string, CountRow>();
  const products = new Map<string, CountRow>();
  const appointmentsWithSale = new Set(sales.map((s) => s.appointment_id).filter(Boolean));
  for (const sale of sales) {
    for (const item of (sale.sale_items ?? []) as Record<string, any>[]) {
      const bucket = item.item_type === "product" ? products : services;
      const row = bucket.get(item.description) ?? { name: item.description, count: 0, totalCents: 0 };
      row.count += item.quantity;
      row.totalCents += item.total_cents;
      bucket.set(item.description, row);
    }
  }
  const heatmap = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  for (const appt of apptRows) {
    const weekday = new Date(`${appt.appointment_date}T12:00:00Z`).getUTCDay();
    const hour = Number(String(appt.start_time).slice(0, 2));
    if (hour >= 0 && hour < 24) heatmap[weekday][hour] += 1;
  }
  for (const appt of apptRows) {
    if (appt.status !== "COMPLETED" || appointmentsWithSale.has(appt.id) || !appt.service) continue;
    const name = appt.service.name as string;
    const row = services.get(name) ?? { name, count: 0, totalCents: 0 };
    row.count += 1;
    services.set(name, row);
  }

  const byCount = (a: CountRow, b: CountRow) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR");
  const salesTotal = sales.reduce((s, r) => s + r.total_cents, 0);

  return {
    cash: Array.from(series.values()),
    groupBy,
    inCents,
    outCents,
    services: Array.from(services.values()).sort(byCount),
    products: Array.from(products.values()).sort(byCount),
    paymentMethods: Array.from(methods.entries())
      .map(([method, totalCents]) => ({ method: method as PaymentMethod, totalCents }))
      .filter((m) => m.totalCents > 0)
      .sort((a, b) => b.totalCents - a.totalCents),
    salesCount: sales.length,
    averageTicketCents: sales.length ? Math.round(salesTotal / sales.length) : 0,
    heatmap,
  };
}
