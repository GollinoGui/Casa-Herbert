import { LinkButton } from "@/components/ui/Button";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { FadeIn } from "@/components/motion/FadeIn";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-cream via-brand-cream to-brand-sage/20 pb-16 pt-14 sm:pb-24 sm:pt-20">
      <ParallaxLeaf className="pointer-events-none absolute -left-6 top-8 hidden sm:block" size={90} variant="leaf" speed="slow" />
      <ParallaxLeaf className="pointer-events-none absolute right-2 top-28 hidden md:block" size={68} variant="branch" />
      <ParallaxLeaf className="pointer-events-none absolute bottom-6 left-[18%] hidden lg:block" size={54} variant="leaf" />

      <div className="container-herbert relative grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <FadeIn>
            <p className="eyebrow mb-5">Orlândia, SP</p>
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
          <PlaceholderImage
            label="Casa Herbert — ambiente acolhedor"
            tone="sage"
            className="aspect-[4/5] w-full shadow-soft"
          />
        </FadeIn>
      </div>
    </section>
  );
}
