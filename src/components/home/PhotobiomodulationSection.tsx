import { Leaf } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { FadeIn } from "@/components/motion/FadeIn";

export function PhotobiomodulationSection() {
  return (
    <section className="section-padding relative overflow-hidden bg-gradient-to-bl from-brand-gold/15 via-brand-cream to-white">
      <div className="pointer-events-none absolute left-1/4 top-0 h-56 w-56 rounded-full bg-brand-gold/20 blur-3xl" />
      <div className="container-herbert relative grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <FadeIn>
          <p className="eyebrow mb-3 inline-flex items-center gap-1.5">
            <Leaf size={12} className="text-brand-moss" aria-hidden="true" />
            Fotobiomodulação
          </p>
          <h2 className="font-serif text-3xl text-brand-forest sm:text-4xl">
            Luz de baixa intensidade a favor do seu couro cabeludo
          </h2>
          <p className="mt-5 max-w-lg text-brand-graphite/80">
            A fotobiomodulação é uma das etapas do acompanhamento capilar na Casa Herbert, indicada
            dentro do protocolo individual de cada cliente como parte do cuidado contínuo com a saúde
            do couro cabeludo.
          </p>
          <div className="mt-8">
            <LinkButton href="/terapia-capilar" variant="secondary">
              Entender como funciona
            </LinkButton>
          </div>
        </FadeIn>
        <FadeIn direction="left" delay={0.1}>
          <PlaceholderImage
            label="Sessão de fotobiomodulação"
            tone="gold"
            className="aspect-[4/3] w-full"
          />
        </FadeIn>
      </div>
    </section>
  );
}
