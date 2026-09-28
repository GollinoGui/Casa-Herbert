import type { AppointmentWithRelations, Customer } from "@/types";
import { canonicalPhone } from "@/lib/utils/phone";
import { getSupabase, PG_UNIQUE_VIOLATION, unwrap } from "@/lib/supabase/server";
import { APPOINTMENT_WITH_RELATIONS, toAppointmentWithRelations, toCustomer } from "@/lib/supabase/mappers";

export async function getCustomers(): Promise<Customer[]> {
  const rows = unwrap(await getSupabase().from("customers").select("*"));
  return rows.map(toCustomer).sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const row = unwrap(await getSupabase().from("customers").select("*").eq("id", id).maybeSingle());
  return row ? toCustomer(row) : null;
}

/** O cliente é reconhecido pelo telefone canônico (com ou sem 55, com ou sem máscara). */
export async function findCustomerByPhone(phone: string): Promise<Customer | null> {
  const row = unwrap(
    await getSupabase().from("customers").select("*").eq("normalized_phone", canonicalPhone(phone)).maybeSingle()
  );
  return row ? toCustomer(row) : null;
}

export async function getCustomerAppointments(customerId: string): Promise<AppointmentWithRelations[]> {
  const rows = unwrap(
    await getSupabase()
      .from("appointments")
      .select(APPOINTMENT_WITH_RELATIONS)
      .eq("customer_id", customerId)
      .order("appointment_date", { ascending: false })
      .order("start_time", { ascending: false })
  );
  return rows.map(toAppointmentWithRelations);
}

export interface FindOrCreateCustomerInput {
  fullName: string;
  phone: string;
  email?: string | null;
}

/**
 * Deduplica pelo telefone canônico — não representa login, só liga o pedido à ficha
 * que já existe. Um cliente já cadastrado mantém o nome da ficha: quem digita um
 * telefone no site não pode renomear o cadastro feito no painel. O e-mail só é
 * preenchido se a ficha ainda não tiver um.
 */
export async function findOrCreateCustomer(input: FindOrCreateCustomerInput): Promise<Customer> {
  const supabase = getSupabase();

  const existing = await findCustomerByPhone(input.phone);
  if (existing) {
    if (input.email && !existing.email) {
      const row = unwrap(
        await supabase.from("customers").update({ email: input.email }).eq("id", existing.id).select("*").single()
      );
      return toCustomer(row);
    }
    return existing;
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

export interface CustomerInput {
  fullName: string;
  phone: string;
  email: string | null;
}

export type SaveCustomerResult = { ok: true; customer: Customer } | { ok: false; error: string };

async function phoneTakenError(phone: string): Promise<SaveCustomerResult> {
  const owner = await findCustomerByPhone(phone);
  return {
    ok: false,
    error: owner
      ? `Esse telefone já está cadastrado para ${owner.fullName}.`
      : "Esse telefone já está cadastrado para outro cliente.",
  };
}

export async function createCustomer(input: CustomerInput): Promise<SaveCustomerResult> {
  const result = await getSupabase()
    .from("customers")
    .insert({ full_name: input.fullName, phone: input.phone, email: input.email || null })
    .select("*")
    .single();
  if (result.error?.code === PG_UNIQUE_VIOLATION) return phoneTakenError(input.phone);
  return { ok: true, customer: toCustomer(unwrap(result)) };
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<SaveCustomerResult> {
  const result = await getSupabase()
    .from("customers")
    .update({ full_name: input.fullName, phone: input.phone, email: input.email || null })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (result.error?.code === PG_UNIQUE_VIOLATION) return phoneTakenError(input.phone);
  const row = unwrap(result);
  if (!row) return { ok: false, error: "Cliente não encontrado." };
  return { ok: true, customer: toCustomer(row) };
}

export async function updateCustomerNotes(id: string, notes: string): Promise<Customer | null> {
  const row = unwrap(
    await getSupabase().from("customers").update({ notes }).eq("id", id).select("*").maybeSingle()
  );
  return row ? toCustomer(row) : null;
}
