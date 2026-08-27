import { Star } from "lucide-react";
import type { Testimonial } from "@/types";
import { Marquee } from "@/components/ui/Marquee";
import { FadeIn } from "@/components/motion/FadeIn";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="w-72 shrink-0 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:w-80">
      <div className="flex gap-1">
        {Array.from({ length: testimonial.rating }).map((_, i) => (
          <Star key={i} size={14} className="fill-brand-gold text-brand-gold" />
        ))}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-brand-cream/85">&ldquo;{testimonial.content}&rdquo;</p>
      <div className="mt-5 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 font-serif text-sm text-brand-gold">
          {getInitials(testimonial.customerName)}
        </span>
        <p className="text-xs font-medium uppercase tracking-wide text-brand-sage">{testimonial.customerName}</p>
      </div>
    </div>
  );
}

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  // Com poucos depoimentos, duas fileiras deixam alguma delas quase vazia — melhor uma só.
  const useTwoRows = testimonials.length >= 4;
  const splitAt = Math.ceil(testimonials.length / 2);
  const firstRow = useTwoRows ? testimonials.slice(0, splitAt) : testimonials;
  const secondRow = useTwoRows ? testimonials.slice(splitAt) : [];

  return (
    <section className="section-padding overflow-hidden bg-brand-forest text-brand-cream">
      <div className="container-herbert">
        <FadeIn>
          <div className="text-center">
            <p className="eyebrow mb-3 !text-brand-sage">Depoimentos</p>
            <h2 className="font-serif text-3xl text-brand-cream sm:text-4xl">
              Quem já vive a experiência Casa Herbert
            </h2>
            <p className="mt-3 text-sm text-brand-cream/70">Avaliações reais de clientes no Google</p>
          </div>
        </FadeIn>
      </div>

      <div className="relative mt-12 flex flex-col gap-4">
        <Marquee pauseOnHover className="[--duration:35s]">
          {firstRow.map((t) => (
            <TestimonialCard key={t.id} testimonial={t} />
          ))}
        </Marquee>
        {secondRow.length > 0 && (
          <Marquee reverse pauseOnHover className="[--duration:35s]">
            {secondRow.map((t) => (
              <TestimonialCard key={t.id} testimonial={t} />
            ))}
          </Marquee>
        )}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-brand-forest sm:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-brand-forest sm:w-32" />
      </div>
    </section>
  );
}
