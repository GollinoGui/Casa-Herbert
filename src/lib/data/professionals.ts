import type { AppointmentProduct, Professional } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";

export async function getActiveProfessionals(): Promise<Professional[]> {
  const rows = unwrap(
    await getSupabase().from("professionals").select("*").eq("is_active", true).order("created_at")
  );
  return rows.map((r) => ({ id: r.id, name: r.name, isActive: r.is_active }));
}

export async function getAppointmentProducts(appointmentId: string): Promise<AppointmentProduct[]> {
  const rows = unwrap(
    await getSupabase()
      .from("appointment_products")
      .select("product_id, quantity, product:products(name, price_cents)")
      .eq("appointment_id", appointmentId)
  ) as Record<string, any>[];
  return rows.map((r) => ({
    productId: r.product_id,
    quantity: r.quantity,
    name: r.product?.name ?? "Produto",
    priceCents: r.product?.price_cents ?? 0,
  }));
}

/** Troca a lista inteira. Duas escritas, mas sem risco: a lista é só uma intenção (o estoque baixa na venda). */
export async function setAppointmentProducts(
  appointmentId: string,
  lines: { productId: string; quantity: number }[]
) {
  const supabase = getSupabase();
  unwrap(await supabase.from("appointment_products").delete().eq("appointment_id", appointmentId));
  if (lines.length === 0) return;
  unwrap(
    await supabase.from("appointment_products").insert(
      lines.map((l) => ({ appointment_id: appointmentId, product_id: l.productId, quantity: l.quantity }))
    )
  );
}
