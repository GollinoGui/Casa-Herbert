import type { Testimonial } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";
import { toTestimonial } from "@/lib/supabase/mappers";

export async function getPublishedTestimonials(): Promise<Testimonial[]> {
  const rows = unwrap(
    await getSupabase().from("testimonials").select("*").eq("is_published", true).order("display_order")
  );
  return rows.map(toTestimonial);
}

export async function getAllTestimonials(): Promise<Testimonial[]> {
  const rows = unwrap(await getSupabase().from("testimonials").select("*").order("display_order"));
  return rows.map(toTestimonial);
}

export interface TestimonialInput {
  customerName: string;
  rating: number;
  content: string;
  isPublished: boolean;
}

function toRow(input: Partial<TestimonialInput>) {
  const row: Record<string, unknown> = {};
  if (input.customerName !== undefined) row.customer_name = input.customerName;
  if (input.rating !== undefined) row.rating = input.rating;
  if (input.content !== undefined) row.content = input.content;
  if (input.isPublished !== undefined) row.is_published = input.isPublished;
  return row;
}

export async function createTestimonial(input: TestimonialInput): Promise<Testimonial> {
  const supabase = getSupabase();
  const { count } = await supabase.from("testimonials").select("id", { count: "exact", head: true });
  const row = unwrap(
    await supabase
      .from("testimonials")
      .insert({ ...toRow(input), display_order: (count ?? 0) + 1 })
      .select("*")
      .single()
  );
  return toTestimonial(row);
}

export async function updateTestimonial(id: string, input: Partial<TestimonialInput>): Promise<Testimonial | null> {
  const row = unwrap(
    await getSupabase().from("testimonials").update(toRow(input)).eq("id", id).select("*").maybeSingle()
  );
  return row ? toTestimonial(row) : null;
}

export async function deleteTestimonial(id: string): Promise<void> {
  unwrap(await getSupabase().from("testimonials").delete().eq("id", id));
}
