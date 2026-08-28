import { Leaf } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { FadeIn } from "@/components/motion/FadeIn";
import { HeroPhoto } from "@/components/motion/HeroPhoto";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-cream via-brand-cream to-brand-sage/30 pb-16 pt-14 sm:pb-24 sm:pt-20">
      <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-brand-sage/25 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-brand-gold/15 blur-3xl" />

      <ParallaxLeaf className="pointer-events-none absolute -left-6 top-8 hidden sm:block" size={90} variant="leaf" speed="slow" tone="moss" />
      <ParallaxLeaf className="pointer-events-none absolute right-2 top-28 hidden md:block" size={68} variant="branch" />
      <ParallaxLeaf className="pointer-events-none absolute bottom-6 left-[18%] hidden lg:block" size={54} variant="leaf" />
      <ParallaxLeaf className="pointer-events-none absolute right-[12%] bottom-10 hidden lg:block" size={40} variant="leaf" tone="moss" speed="slow" />

      <div className="container-herbert relative grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <FadeIn>
            <p className="eyebrow mb-5 inline-flex items-center gap-1.5">
              <Leaf size={12} className="text-brand-moss" aria-hidden="true" />
              Orlândia, SP
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 className="font-serif text-5xl leading-[1.05] text-brand-forest sm:text-6xl lg:text-7xl">
              Casa Herbert
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="mt-3 font-serif text-xl italic text-brand-moss sm:text-2xl">
              Embelezamento e Saúde Capilar
            </p>
          </FadeIn>
          <FadeIn delay={0.32}>
            <p className="mt-7 max-w-md text-balance text-lg text-brand-graphite/80">
              Cuidar do seu couro cabeludo é cuidar de você.
            </p>
          </FadeIn>
          <FadeIn delay={0.44}>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <LinkButton href="/agendar" variant="primary">
                Agendar avaliação
              </LinkButton>
              <LinkButton href="/servicos" variant="secondary">
                Conhecer nossos cuidados
              </LinkButton>
            </div>
          </FadeIn>
        </div>

        <FadeIn direction="left" delay={0.2}>
          <HeroPhoto src="/images/hero-fachada.png" alt="Fachada da Casa Herbert em Orlândia" />
        </FadeIn>
      </div>
    </section>
  );
}
