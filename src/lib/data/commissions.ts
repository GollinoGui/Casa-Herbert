import type { Brand, CommissionRule, CommissionScope, PaymentMethod, Professional } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";
import { addDaysToDateStr, todayDateStr } from "@/lib/utils/date-format";

export type CommissionKind = "professional" | "brand";

type Result = { ok: true } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Profissionais e marcas
// ---------------------------------------------------------------------------

export async function listAllProfessionals(): Promise<Professional[]> {
  const rows = unwrap(await getSupabase().from("professionals").select("*").order("created_at"));
  return rows.map((r) => ({ id: r.id, name: r.name, isActive: r.is_active }));
}

export async function saveProfessional(input: { id?: string; name: string; isActive: boolean }): Promise<Result> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Informe o nome." };
  const row = { name, is_active: input.isActive };
  const supabase = getSupabase();
  unwrap(input.id ? await supabase.from("professionals").update(row).eq("id", input.id) : await supabase.from("professionals").insert(row));
  return { ok: true };
}

function toBrand(r: Record<string, any>): Brand {
  return { id: r.id, name: r.name, isConsigned: r.is_consigned, commissionBps: r.commission_bps, isActive: r.is_active };
}

export async function listBrands(): Promise<Brand[]> {
  const rows = unwrap(await getSupabase().from("brands").select("*").order("name"));
  return rows.map(toBrand);
}

export async function saveBrand(input: Omit<Brand, "id"> & { id?: string }): Promise<Result> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Informe o nome da marca." };
  if (!Number.isInteger(input.commissionBps) || input.commissionBps < 0 || input.commissionBps > 10000) {
    return { ok: false, error: "A comissão deve ficar entre 0% e 100%." };
  }
  const row = { name, is_consigned: input.isConsigned, commission_bps: input.commissionBps, is_active: input.isActive };
  const supabase = getSupabase();
  unwrap(input.id ? await supabase.from("brands").update(row).eq("id", input.id) : await supabase.from("brands").insert(row));
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Regras de percentual
// ---------------------------------------------------------------------------

export async function listCommissionRules(): Promise<CommissionRule[]> {
  const rows = unwrap(await getSupabase().from("commission_rules").select("*"));
  return rows.map((r) => ({
    id: r.id,
    professionalId: r.professional_id,
    scope: r.scope,
    refId: r.ref_id,
    rateBps: r.rate_bps,
  }));
}

const SCOPES: CommissionScope[] = ["service_default", "product_default", "service", "product", "brand"];

/** rateBps null apaga a regra (volta a valer a regra de cima). */
export async function saveCommissionRule(input: {
  professionalId: string | null;
  scope: CommissionScope;
  refId: string | null;
  rateBps: number | null;
}): Promise<Result> {
  if (!SCOPES.includes(input.scope)) return { ok: false, error: "Regra inválida." };
  const isDefault = input.scope.endsWith("_default");
  if (isDefault !== !input.refId) return { ok: false, error: "Escolha o item da regra." };
  if (input.rateBps !== null && (!Number.isInteger(input.rateBps) || input.rateBps < 0 || input.rateBps > 10000)) {
    return { ok: false, error: "A comissão deve ficar entre 0% e 100%." };
  }
  const supabase = getSupabase();
  const existing = (await listCommissionRules()).find(
    (r) => r.professionalId === input.professionalId && r.scope === input.scope && r.refId === (input.refId || null)
  );
  if (input.rateBps === null) {
    if (existing) unwrap(await supabase.from("commission_rules").delete().eq("id", existing.id));
  } else if (existing) {
    unwrap(await supabase.from("commission_rules").update({ rate_bps: input.rateBps }).eq("id", existing.id));
  } else {
    unwrap(
      await supabase.from("commission_rules").insert({
        professional_id: input.professionalId,
        scope: input.scope,
        ref_id: input.refId || null,
        rate_bps: input.rateBps,
      })
    );
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Extrato e saldo
// ---------------------------------------------------------------------------

interface LineRow {
  kind: CommissionKind;
  ref_id: string;
  sale_id: string | null;
  appointment_id: string | null;
  line_date: string;
  description: string;
  base_cents: number;
  full_cents: number;
  earned_base_cents: number;
  earned_cents: number;
}

interface BalanceRow {
  kind: CommissionKind;
  ref_id: string;
  earned_cents: number;
  paid_cents: number;
}

export interface CommissionLine {
  key: string;
  date: string;
  description: string;
  /** Valor vendido sobre o qual a linha incide (com o desconto rateado). */
  baseCents: number;
  /** Comissão cheia da venda/sessão. */
  fullCents: number;
  /** Quanto ficou devido dentro do período (dinheiro que entrou nele). */
  earnedCents: number;
  /** Ainda falta a cliente pagar parte da venda. */
  pending: boolean;
}

export interface CommissionPayment {
  id: string;
  date: string;
  amountCents: number;
  method: PaymentMethod | null;
  description: string;
  reversed: boolean;
  isReversal: boolean;
}

export interface CommissionTarget {
  kind: CommissionKind;
  id: string;
  name: string;
  isActive: boolean;
  /** Para marca: a parte que a marca deixa no salão, em bps. */
  brandCommissionBps?: number;
  earnedPeriodCents: number;
  /** Valor vendido correspondente ao que entrou no período. Marca: base − devido = o que fica com o salão. */
  earnedBasePeriodCents: number;
  paidPeriodCents: number;
  /** Devido hoje: tudo o que já entrou menos tudo o que já foi pago. Negativo = abate no próximo. */
  owedCents: number;
  lines: CommissionLine[];
  payments: CommissionPayment[];
}

async function rpcRows<T>(name: string, until: string): Promise<T[]> {
  return (unwrap(await getSupabase().rpc(name, { p_until: until })) ?? []) as T[];
}

const lineKey = (l: LineRow) => `${l.kind}:${l.ref_id}:${l.sale_id}:${l.appointment_id ?? ""}`;
const targetKey = (kind: string, id: string) => `${kind}:${id}`;

export async function getCommissionOverview(dateFrom: string, dateTo: string): Promise<CommissionTarget[]> {
  const before = addDaysToDateStr(dateFrom, -1);
  const today = todayDateStr();
  const [professionals, brands, linesTo, linesBefore, balancesNow, entries] = await Promise.all([
    listAllProfessionals(),
    listBrands(),
    rpcRows<LineRow>("commission_lines", dateTo),
    rpcRows<LineRow>("commission_lines", before),
    rpcRows<BalanceRow>("commission_balances", today > dateTo ? today : dateTo),
    getSupabase()
      .from("cash_entries")
      .select("*")
      .in("category", ["comissao", "repasse", "estorno"])
      .gte("entry_date", dateFrom)
      .lte("entry_date", dateTo)
      .order("entry_date", { ascending: false })
      .then(unwrap)
      .then((rows) => rows.filter((e) => e.professional_id || e.brand_id)),
  ]);

  const linesBeforeByKey = new Map(linesBefore.map((l) => [lineKey(l), l]));
  const owed = new Map(balancesNow.map((b) => [targetKey(b.kind, b.ref_id), b.earned_cents - b.paid_cents]));
  const reversedIds = new Set(entries.filter((e) => e.reversal_of).map((e) => e.reversal_of));

  const targets: CommissionTarget[] = [
    ...professionals.map((p) => ({ kind: "professional" as const, id: p.id, name: p.name, isActive: p.isActive })),
    ...brands
      .filter((b) => b.isConsigned)
      .map((b) => ({ kind: "brand" as const, id: b.id, name: b.name, isActive: b.isActive, brandCommissionBps: b.commissionBps })),
  ].map((t) => ({ ...t, earnedPeriodCents: 0, earnedBasePeriodCents: 0, paidPeriodCents: 0, owedCents: owed.get(targetKey(t.kind, t.id)) ?? 0, lines: [], payments: [] }));
  const byKey = new Map(targets.map((t) => [targetKey(t.kind, t.id), t]));

  for (const l of linesTo) {
    const target = byKey.get(targetKey(l.kind, l.ref_id));
    if (!target) continue;
    const prev = linesBeforeByKey.get(lineKey(l));
    const earned = l.earned_cents - (prev?.earned_cents ?? 0);
    // Venda/sessão do período ainda sem dinheiro também aparece (fica "a receber").
    if (earned === 0 && l.line_date < dateFrom) continue;
    target.earnedPeriodCents += earned;
    target.earnedBasePeriodCents += l.earned_base_cents - (prev?.earned_base_cents ?? 0);
    target.lines.push({
      key: lineKey(l),
      date: l.line_date,
      description: l.description,
      baseCents: l.base_cents,
      fullCents: l.full_cents,
      earnedCents: earned,
      pending: l.earned_cents < l.full_cents,
    });
  }

  for (const e of entries) {
    const target = byKey.get(e.professional_id ? targetKey("professional", e.professional_id) : targetKey("brand", e.brand_id));
    if (!target) continue;
    const signed = e.direction === "out" ? e.amount_cents : -e.amount_cents;
    target.paidPeriodCents += signed;
    target.payments.push({
      id: e.id,
      date: e.entry_date,
      amountCents: e.amount_cents,
      method: e.payment_method,
      description: e.description,
      reversed: reversedIds.has(e.id),
      isReversal: !!e.reversal_of,
    });
  }

  for (const t of targets) t.lines.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return targets.filter((t) => t.isActive || t.owedCents !== 0 || t.lines.length || t.payments.length);
}

export async function payCommission(input: {
  kind: CommissionKind;
  refId: string;
  amountCents: number;
  method: PaymentMethod;
  date: string;
  notes?: string | null;
}): Promise<Result> {
  const r = unwrap(await getSupabase().rpc("pay_commission", { p: input })) as { ok: boolean; error?: string };
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? "Erro ao registrar o pagamento." };
}

export async function undoCommissionPayment(entryId: string): Promise<Result> {
  const r = unwrap(await getSupabase().rpc("undo_commission_payment", { p_entry_id: entryId })) as { ok: boolean; error?: string };
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? "Erro ao desfazer o pagamento." };
}
