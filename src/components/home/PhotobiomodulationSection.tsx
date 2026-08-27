import { LinkButton } from "@/components/ui/Button";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { FadeIn } from "@/components/motion/FadeIn";

export function PhotobiomodulationSection() {
  return (
    <section className="section-padding bg-brand-sage/10">
      <div className="container-herbert grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <FadeIn>
          <p className="eyebrow mb-3">Fotobiomodulação</p>
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
