"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import {
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  type TestimonialInput,
} from "@/lib/data/testimonials";

function revalidateTestimonialPaths() {
  revalidatePath("/admin/depoimentos");
  revalidatePath("/");
}

export async function createTestimonialAction(input: TestimonialInput) {
  await requireAdmin();
  const testimonial = await createTestimonial(input);
  revalidateTestimonialPaths();
  return testimonial;
}

export async function updateTestimonialAction(id: string, input: Partial<TestimonialInput>) {
  await requireAdmin();
  const testimonial = await updateTestimonial(id, input);
  revalidateTestimonialPaths();
  return testimonial;
}

export async function deleteTestimonialAction(id: string) {
  await requireAdmin();
  await deleteTestimonial(id);
  revalidateTestimonialPaths();
}
