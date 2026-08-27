import type { Metadata } from "next";
import { getAllTestimonials } from "@/lib/data/testimonials";
import { TestimonialsManager } from "@/components/admin/TestimonialsManager";

export const metadata: Metadata = { title: "Depoimentos" };

export default async function DepoimentosPage() {
  const testimonials = await getAllTestimonials();
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Depoimentos</p>
        <h1 className="font-serif text-3xl text-brand-forest">Depoimentos de clientes</h1>
      </div>
      <TestimonialsManager testimonials={testimonials} />
    </div>
  );
}
