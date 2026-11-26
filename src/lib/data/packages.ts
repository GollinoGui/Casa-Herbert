import type { CustomerPackage, CustomerPackageStatus, PaymentMethod, ServicePackage } from "@/types";
import { fetchAll, getSupabase, unwrap } from "@/lib/supabase/server";

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

/** Sessões usadas = atendimentos concluídos ligados ao pacote (0017). */
async function sessionsUsedBy(packageIds: string[]): Promise<Map<string, number>> {
  const used = new Map<string, number>();
  if (!packageIds.length) return used;
  const rows = await fetchAll<{ id: string; customer_package_id: string }>((from, to) =>
    getSupabase()
      .from("appointments")
      .select("id, customer_package_id")
      .in("customer_package_id", packageIds)
      .eq("status", "COMPLETED")
      .order("id")
      .range(from, to)
  );
  for (const r of rows) used.set(r.customer_package_id, (used.get(r.customer_package_id) ?? 0) + 1);
  return used;
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
  const used = await sessionsUsedBy(rows.map((r) => r.id));
  return rows.map(
    (r): CustomerPackage => ({
      id: r.id,
      customerId: r.customer_id,
      customerName: r.customer?.full_name ?? "",
      serviceId: r.service_id,
      serviceName: r.service?.name ?? "",
      name: r.name,
      sessionsTotal: r.sessions_total,
      sessionsUsed: used.get(r.id) ?? 0,
      sessionValueCents: r.session_value_cents,
      saleId: r.sale_id,
      status: r.status,
      expiresOn: r.expires_on ?? null,
      createdAt: r.created_at,
    })
  );
}

export type PackageActionResult = { ok: true; saleId?: string; remaining?: number } | { ok: false; error: string };

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
  };
  return result.ok ? { ok: true, saleId: result.saleId } : { ok: false, error: result.error ?? "Não foi possível vender o pacote." };
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
