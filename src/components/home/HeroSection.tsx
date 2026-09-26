import Image from "next/image";
import { Leaf, Sparkles } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { FadeIn } from "@/components/motion/FadeIn";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";
import { EdgeBranchArt } from "@/components/motion/EdgeBranchArt";
import { MarginThread } from "@/components/motion/MarginThread";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-brand-cream">
      <div className="grid lg:grid-cols-12 lg:items-stretch">
        <div className="relative hidden lg:col-span-3 lg:flex lg:items-center lg:justify-center lg:bg-brand-sage/10 lg:px-6 xl:px-8">
          <FadeIn direction="right" delay={0.5} className="w-full max-w-[240px]">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-soft">
              <Image
                src="/images/servicos/fotobiomodulacao.jpg"
                alt="Aplicação de fotobiomodulação capilar na Casa Herbert"
                fill
                sizes="22vw"
                className="object-cover"
              />
            </div>
          </FadeIn>
        </div>

        <div className="relative isolate overflow-hidden bg-gradient-to-b from-brand-cream via-brand-cream to-brand-sage/30 px-5 py-16 sm:px-8 sm:py-24 lg:col-span-5 lg:flex lg:flex-col lg:justify-center lg:px-10 lg:py-20 xl:px-12">
          <EdgeBranchArt tone="moss" className="top-0 h-56 opacity-70 sm:h-64" />
          <div className="pointer-events-none absolute -right-10 top-0 h-72 w-72 rounded-full bg-brand-sage/25 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-brand-gold/15 blur-3xl" />

          <MarginThread side="left" tone="gold" className="top-10 bottom-10" />

          <ParallaxLeaf className="pointer-events-none absolute -left-6 top-8 hidden sm:block" size={90} variant="leaf" speed="slow" tone="moss" />
          <ParallaxLeaf className="pointer-events-none absolute right-4 top-24 hidden md:block" size={60} variant="branch" />
          <ParallaxLeaf className="pointer-events-none absolute bottom-6 left-[18%] hidden lg:block" size={54} variant="leaf" />

          <FadeIn>
            <p className="eyebrow relative mb-5 inline-flex items-center gap-1.5">
              <Leaf size={12} className="text-brand-moss" aria-hidden="true" />
              Orlândia, SP
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 className="relative font-serif text-5xl leading-[1.05] text-brand-forest sm:text-6xl lg:text-6xl xl:text-7xl">
              Casa Herbert
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="relative mt-3 font-serif text-xl italic text-brand-moss sm:text-2xl">
              Embelezamento e Saúde Capilar
            </p>
          </FadeIn>
          <FadeIn delay={0.32}>
            <p className="relative mt-7 max-w-md text-balance text-lg text-brand-graphite/80">
              Cuidar do seu couro cabeludo é cuidar de você.
            </p>
          </FadeIn>
          <FadeIn delay={0.44}>
            <div className="relative mt-9 flex flex-col gap-4 sm:flex-row">
              <LinkButton href="/agendar" variant="primary">
                Agendar avaliação
              </LinkButton>
              <LinkButton href="/servicos" variant="secondary">
                Conhecer nossos cuidados
              </LinkButton>
            </div>
          </FadeIn>

          <FadeIn delay={0.56}>
            <div className="relative mt-12 hidden max-w-sm items-end gap-4 sm:flex">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl shadow-soft sm:h-28 sm:w-28">
                <Image
                  src="/images/servicos/terapia-capilar.jpg"
                  alt="Sessão de terapia capilar na Casa Herbert"
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </div>
              <div className="mb-1 rounded-2xl bg-brand-moss px-5 py-4 shadow-soft">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.2em] text-brand-cream/80">
                  <Sparkles size={12} aria-hidden="true" />
                  Sem fórmula fixa
                </p>
                <p className="mt-1.5 font-serif text-sm italic text-white">Avaliação individual, sempre.</p>
              </div>
            </div>
          </FadeIn>
        </div>

        <div className="relative min-h-[280px] overflow-hidden sm:min-h-[380px] lg:col-span-4 lg:min-h-[560px]">
          <FadeIn direction="left" delay={0.2} className="h-full">
            <div className="relative h-full w-full">
              <Image
                src="/images/hero-fachada.png"
                alt="Fachada da Casa Herbert em Orlândia"
                fill
                sizes="(min-width: 1024px) 34vw, 100vw"
                className="object-cover object-right"
                priority
              />
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
