import { Leaf, Sparkles } from "lucide-react";
import { SiteImage } from "@/components/ui/SiteImage";
import { LinkButton } from "@/components/ui/Button";
import { FadeIn } from "@/components/motion/FadeIn";
import { HeroPhoto } from "@/components/motion/HeroPhoto";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";
import { EdgeBranchArt } from "@/components/motion/EdgeBranchArt";
import { MarginThread } from "@/components/motion/MarginThread";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-cream via-brand-cream to-brand-sage/30 pb-16 pt-14 sm:pb-24 sm:pt-20">
      <EdgeBranchArt tone="moss" className="top-0 h-56 opacity-70 sm:h-64" />
      <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-brand-sage/25 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-brand-gold/15 blur-3xl" />

      <MarginThread side="left" tone="gold" className="top-10 bottom-10" />
      <MarginThread side="right" tone="gold" className="top-10 bottom-10" />

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
            <h1 className="font-serif text-[2.6rem] leading-[1.05] text-brand-forest min-[360px]:text-5xl sm:text-6xl lg:text-7xl">
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

          <FadeIn delay={0.56}>
            <div className="mt-10 flex max-w-sm items-end gap-3 sm:mt-12 sm:gap-4">
              <SiteImage
                slot="home.hero-thumb"
                alt="Sessão de terapia capilar na Casa Herbert"
                placeholderLabel=""
                sizes="112px"
                className="h-20 w-20 shrink-0 shadow-soft sm:h-28 sm:w-28"
              />
              <div className="mb-1 min-w-0 rounded-2xl bg-brand-moss px-4 py-3 shadow-soft sm:px-5 sm:py-4">
                <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-brand-cream/80 sm:text-xs">
                  <Sparkles size={12} aria-hidden="true" className="shrink-0" />
                  Sem fórmula fixa
                </p>
                <p className="mt-1.5 font-serif text-sm italic text-white">Avaliação individual, sempre.</p>
              </div>
            </div>
          </FadeIn>
        </div>

        <FadeIn direction="left" delay={0.2}>
          <HeroPhoto slot="home.hero" alt="Fachada da Casa Herbert em Orlândia" />
        </FadeIn>
      </div>
    </section>
  );
}
