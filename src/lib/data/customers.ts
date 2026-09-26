import type { Customer } from "@/types";
import { normalizePhone } from "@/lib/utils/phone";
import { getSupabase, PG_UNIQUE_VIOLATION, unwrap } from "@/lib/supabase/server";
import { toCustomer } from "@/lib/supabase/mappers";

export async function getCustomers(): Promise<Customer[]> {
  const rows = unwrap(await getSupabase().from("customers").select("*"));
  return rows.map(toCustomer).sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const row = unwrap(await getSupabase().from("customers").select("*").eq("id", id).maybeSingle());
  return row ? toCustomer(row) : null;
}

export interface FindOrCreateCustomerInput {
  fullName: string;
  phone: string;
  email?: string | null;
}

/** Deduplica por telefone normalizado — não representa login, só evita registros repetidos. */
export async function findOrCreateCustomer(input: FindOrCreateCustomerInput): Promise<Customer> {
  const supabase = getSupabase();
  const normalizedPhone = normalizePhone(input.phone);

  const existing = unwrap(
    await supabase.from("customers").select("*").eq("normalized_phone", normalizedPhone).maybeSingle()
  );
  if (existing) {
    const update: Record<string, unknown> = { full_name: input.fullName };
    if (input.email) update.email = input.email;
    const row = unwrap(await supabase.from("customers").update(update).eq("id", existing.id).select("*").single());
    return toCustomer(row);
  }

  const inserted = await supabase
    .from("customers")
    .insert({ full_name: input.fullName, phone: input.phone, email: input.email || null })
    .select("*")
    .single();
  // Corrida: outra requisição criou o mesmo telefone entre o select e o insert.
  if (inserted.error?.code === PG_UNIQUE_VIOLATION) return findOrCreateCustomer(input);
  return toCustomer(unwrap(inserted));
}

export async function updateCustomerNotes(id: string, notes: string): Promise<Customer | null> {
  const row = unwrap(
    await getSupabase().from("customers").update({ notes }).eq("id", id).select("*").maybeSingle()
  );
  return row ? toCustomer(row) : null;
}
