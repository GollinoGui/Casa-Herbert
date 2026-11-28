import type { CustomerPackage, CustomerPackageStatus, PackageOutcome, PaymentMethod, ServicePackage } from "@/types";
import { fetchAll, getSupabase, unwrap } from "@/lib/supabase/server";
import { isSlotConflictError } from "@/lib/data/availability";

type Row = Record<string, any>;

function toServicePackage(r: Row): ServicePackage {
  return {
    id: r.id,
    name: r.name,
    serviceId: r.service_id,
    serviceName: r.service?.name ?? "",
    sessions: r.sessions,
    priceCents: r.price_cents,
    validDays: r.valid_days ?? null,
    isActive: r.is_active,
  };
}

export async function listServicePackages(onlyActive = false): Promise<ServicePackage[]> {
  let query = getSupabase().from("service_packages").select("*, service:services(name)");
  if (onlyActive) query = query.eq("is_active", true);
  const rows = unwrap(await query.order("created_at"));
  return rows.map(toServicePackage).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export interface ServicePackageInput {
  name: string;
  serviceId: string;
  sessions: number;
  priceCents: number;
  validDays: number | null;
  isActive: boolean;
}

export async function saveServicePackage(id: string | null, input: ServicePackageInput): Promise<void> {
  const row = {
    name: input.name,
    service_id: input.serviceId,
    sessions: input.sessions,
    price_cents: input.priceCents,
    valid_days: input.validDays,
    is_active: input.isActive,
  };
  const supabase = getSupabase();
  unwrap(id ? await supabase.from("service_packages").update(row).eq("id", id) : await supabase.from("service_packages").insert(row));
}

/** Usadas = concluídas + desmarcadas que contaram; agendadas = ainda por acontecer (0018). */
async function sessionCountsBy(packageIds: string[]): Promise<Map<string, { used: number; scheduled: number }>> {
  const counts = new Map<string, { used: number; scheduled: number }>();
  if (!packageIds.length) return counts;
  const rows = await fetchAll<{ id: string; customer_package_id: string; status: string; package_outcome: string | null }>((from, to) =>
    getSupabase()
      .from("appointments")
      .select("id, customer_package_id, status, package_outcome")
      .in("customer_package_id", packageIds)
      .in("status", ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"])
      .order("id")
      .range(from, to)
  );
  for (const r of rows) {
    const c = counts.get(r.customer_package_id) ?? { used: 0, scheduled: 0 };
    if (r.status === "COMPLETED" || (r.status === "CANCELLED" && r.package_outcome === "counted")) c.used++;
    else if (r.status === "PENDING" || r.status === "CONFIRMED") c.scheduled++;
    counts.set(r.customer_package_id, c);
  }
  return counts;
}

export interface CustomerPackageFilters {
  customerId?: string;
  status?: CustomerPackageStatus[];
  serviceId?: string;
}

export async function listCustomerPackages(filters: CustomerPackageFilters = {}): Promise<CustomerPackage[]> {
  let query = getSupabase().from("customer_packages").select("*, customer:customers(full_name), service:services(name)");
  if (filters.customerId) query = query.eq("customer_id", filters.customerId);
  if (filters.serviceId) query = query.eq("service_id", filters.serviceId);
  if (filters.status?.length) query = query.in("status", filters.status);
  const rows = unwrap(await query.order("created_at", { ascending: false }));
  const counts = await sessionCountsBy(rows.map((r) => r.id));
  return rows.map(
    (r): CustomerPackage => ({
      id: r.id,
      customerId: r.customer_id,
      customerName: r.customer?.full_name ?? "",
      serviceId: r.service_id,
      serviceName: r.service?.name ?? "",
      name: r.name,
      sessionsTotal: r.sessions_total,
      sessionsUsed: counts.get(r.id)?.used ?? 0,
      sessionsScheduled: counts.get(r.id)?.scheduled ?? 0,
      sessionValueCents: r.session_value_cents,
      saleId: r.sale_id,
      status: r.status,
      expiresOn: r.expires_on ?? null,
      createdAt: r.created_at,
    })
  );
}

export type PackageActionResult =
  | { ok: true; saleId?: string; customerPackageId?: string; remaining?: number }
  | { ok: false; error: string };

export interface SellPackageInput {
  packageId: string;
  customerId: string;
  saleDate?: string;
  dueDate?: string;
  discountCents?: number;
  notes?: string;
  payment?: { amountCents: number; method: PaymentMethod; receiptTxid?: string };
}

export async function sellPackage(input: SellPackageInput): Promise<PackageActionResult> {
  const result = unwrap(await getSupabase().rpc("sell_package", { p: input })) as {
    ok: boolean;
    error?: string;
    saleId?: string;
    customerPackageId?: string;
  };
  return result.ok ? { ok: true, saleId: result.saleId, customerPackageId: result.customerPackageId } : { ok: false, error: result.error ?? "Não foi possível vender o pacote." };
}

export async function consumePackageSession(appointmentId: string, customerPackageId: string): Promise<PackageActionResult> {
  const result = unwrap(
    await getSupabase().rpc("use_package_session", {
      p_appointment_id: appointmentId,
      p_customer_package_id: customerPackageId,
    })
  ) as { ok: boolean; error?: string; remaining?: number };
  return result.ok ? { ok: true, remaining: result.remaining } : { ok: false, error: result.error ?? "Não foi possível usar a sessão." };
}

export async function getCustomerPackage(id: string): Promise<CustomerPackage | null> {
  const row = unwrap(await getSupabase().from("customer_packages").select("customer_id").eq("id", id).maybeSingle());
  if (!row) return null;
  return (await listCustomerPackages({ customerId: row.customer_id })).find((p) => p.id === id) ?? null;
}

export interface PackageSessionSlot {
  date: string;
  startTime: string;
}

type RpcResult = { ok: boolean; error?: string };

function rpcResult(result: RpcResult, fallback: string): PackageActionResult {
  return result.ok ? { ok: true } : { ok: false, error: result.error ?? fallback };
}

/** Grava a série inteira ou nada. A conferência de horário vem antes (checkPackageSessionSlots). */
export async function schedulePackageSessions(
  customerPackageId: string,
  sessions: PackageSessionSlot[],
  professionalId?: string | null
): Promise<PackageActionResult> {
  const result = await getSupabase().rpc("schedule_package_sessions", {
    p: { customerPackageId, sessions, professionalId: professionalId || null },
  });
  if (result.error && isSlotConflictError(result.error)) return { ok: false, error: "SLOT_NO_LONGER_AVAILABLE" };
  return rpcResult(unwrap(result) as RpcResult, "Não foi possível agendar as sessões.");
}

export async function cancelPackageSession(
  appointmentId: string,
  outcome: PackageOutcome,
  noShow: boolean,
  reason?: string
): Promise<PackageActionResult> {
  const result = unwrap(
    await getSupabase().rpc("cancel_package_session", {
      p_appointment_id: appointmentId,
      p_outcome: outcome,
      p_no_show: noShow,
      p_reason: reason ?? null,
    })
  ) as RpcResult;
  return rpcResult(result, "Não foi possível desmarcar a sessão.");
}

export async function reopenPackageSession(appointmentId: string): Promise<PackageActionResult> {
  const result = await getSupabase().rpc("reopen_package_session", { p_appointment_id: appointmentId });
  if (result.error && isSlotConflictError(result.error)) {
    return { ok: false, error: "Outro atendimento ocupou esse horário. Remarque aquele antes de reabrir a sessão." };
  }
  return rpcResult(unwrap(result) as RpcResult, "Não foi possível reabrir a sessão.");
}

/**
 * Muda a validade de um pacote em andamento (ex.: a cliente viajou e pediu mais prazo).
 * Não aceita data antes de hoje nem antes de uma sessão que já está marcada.
 */
export async function extendPackageValidity(id: string, expiresOn: string, today: string): Promise<PackageActionResult> {
  const supabase = getSupabase();
  const pkg = unwrap(await supabase.from("customer_packages").select("id, status").eq("id", id).maybeSingle());
  if (!pkg) return { ok: false, error: "Pacote não encontrado." };
  if (pkg.status !== "active") return { ok: false, error: "Só dá para mudar a validade de um pacote em andamento." };
  if (expiresOn < today) return { ok: false, error: "A nova validade não pode ser antes de hoje." };

  const scheduled = unwrap(
    await supabase
      .from("appointments")
      .select("appointment_date")
      .eq("customer_package_id", id)
      .in("status", ["PENDING", "CONFIRMED"])
  ).reduce((max: string, r: Row) => (r.appointment_date > max ? r.appointment_date : max), "");
  if (scheduled && expiresOn < scheduled) {
    return { ok: false, error: "Há sessão marcada depois dessa data. Escolha uma validade que cubra as sessões marcadas." };
  }

  unwrap(await supabase.from("customer_packages").update({ expires_on: expiresOn }).eq("id", id).eq("status", "active"));
  return { ok: true };
}
