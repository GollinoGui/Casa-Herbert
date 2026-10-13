import { Leaf, Star } from "lucide-react";
import type { Testimonial } from "@/types";
import { Marquee } from "@/components/ui/Marquee";
import { FadeIn } from "@/components/motion/FadeIn";
import { WordsRise } from "@/components/motion/WordsRise";
import { GrainOverlay } from "@/components/ui/GrainOverlay";

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
    <div className="w-72 shrink-0 rounded-2xl border border-white/10 bg-white/5 p-5 sm:w-80">
      <div className="flex gap-1">
        {Array.from({ length: testimonial.rating }).map((_, i) => (
          <Star key={i} size={14} className="fill-brand-gold text-brand-gold" />
        ))}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-brand-cream">&ldquo;{testimonial.content}&rdquo;</p>
      <div className="mt-5 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 font-serif text-sm text-brand-cream">
          {getInitials(testimonial.customerName)}
        </span>
        <p className="text-xs font-medium uppercase tracking-wide text-brand-cream">{testimonial.customerName}</p>
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
    <section className="wave-top section-padding relative overflow-hidden bg-brand-moss text-brand-cream">
      <GrainOverlay />
      <div className="container-herbert relative">
        <FadeIn>
          <div className="text-center">
            <p className="eyebrow mb-3 inline-flex items-center gap-1.5 !text-brand-cream">
              <Leaf size={12} aria-hidden="true" />
              Depoimentos
            </p>
            <WordsRise
              text="Quem já vive a experiência Casa Herbert"
              delay={0.15}
              className="font-serif text-3xl text-brand-cream sm:text-4xl"
            />
            <p className="mt-3 text-sm text-brand-cream">Quem passou pela Casa Herbert conta como foi.</p>
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
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-brand-moss sm:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-brand-moss sm:w-32" />
      </div>
    </section>
  );
}
