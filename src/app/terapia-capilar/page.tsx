import type { Metadata } from "next";
import { Droplets, HeartHandshake, Leaf, Microscope, Sparkles, Sun } from "lucide-react";
import { SectionHeading } from "@/components/ui/Card";
import { SiteImage } from "@/components/ui/SiteImage";
import { LinkButton } from "@/components/ui/Button";
import { FadeIn } from "@/components/motion/FadeIn";
import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerChildren";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";

export const metadata: Metadata = {
  title: "Terapia Capilar",
  description:
    "Terapia capilar em Orlândia/SP: avaliação capilar, tricoscopia e fotobiomodulação em protocolos individualizados para a saúde do couro cabeludo.",
};

const FEATURES = [
  {
    icon: Leaf,
    title: "Cuidados com o couro cabeludo",
    description:
      "Atenção contínua à saúde do couro cabeludo, base de qualquer protocolo de cuidado capilar.",
  },
  {
    icon: Sparkles,
    title: "Saúde dos fios",
    description: "Acompanhamento que observa a evolução dos fios ao longo do cuidado.",
  },
  {
    icon: Microscope,
    title: "Avaliação capilar",
    description: "Observação individual detalhada antes da definição de qualquer protocolo.",
  },
  {
    icon: Microscope,
    title: "Tricoscopia",
    description: "Exame de observação capilar com equipamento próprio, usado para acompanhamento.",
  },
  {
    icon: Sun,
    title: "Fotobiomodulação",
    description: "Sessões de luz de baixa intensidade voltadas ao acompanhamento da saúde capilar.",
  },
  {
    icon: HeartHandshake,
    title: "Protocolos individualizados",
    description: "Cada caminho de cuidado é desenhado a partir da necessidade de cada cliente.",
  },
];

export default function TerapiaCapilarPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-cream to-brand-sage/15 pb-16 pt-14 sm:pb-20 sm:pt-20">
        <ParallaxLeaf className="pointer-events-none absolute -left-4 top-8 hidden sm:block" size={80} speed="slow" />
        <ParallaxLeaf className="pointer-events-none absolute right-6 bottom-6 hidden md:block" size={56} variant="branch" />
        <div className="container-herbert relative grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <FadeIn>
            <p className="eyebrow mb-4">Terapia Capilar</p>
            <h1 className="font-serif text-4xl leading-tight text-brand-forest sm:text-5xl">
              Acompanhamento contínuo da saúde do couro cabeludo
            </h1>
            <p className="mt-6 max-w-lg text-brand-graphite/80">
              A terapia capilar na Casa Herbert reúne avaliação, observação e tecnologias de
              acompanhamento em um protocolo pensado individualmente — sempre a partir da sua
              necessidade, nunca de uma fórmula pronta.
            </p>
            <div className="mt-8">
              <LinkButton href="/agendar" variant="primary">
                Agendar avaliação
              </LinkButton>
            </div>
          </FadeIn>
          <FadeIn direction="left" delay={0.15}>
            <SiteImage
              slot="terapia.hero"
              alt="Terapia capilar Casa Herbert"
              placeholderTone="sage"
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="aspect-[4/5] w-full"
              priority
            />
          </FadeIn>
        </div>
      </section>

      <section className="section-padding relative overflow-hidden bg-white">
        <div className="pointer-events-none absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-brand-sage/15 blur-3xl" />
        <div className="container-herbert relative">
          <FadeIn>
            <SectionHeading
              eyebrow="Como cuidamos"
              title="Um protocolo construído em etapas"
              description="Cada aspecto do cuidado capilar é conduzido com atenção individual, do primeiro contato ao acompanhamento contínuo."
            />
          </FadeIn>

          <StaggerContainer className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <StaggerItem key={feature.title}>
                <div className="h-full rounded-2xl border border-brand-beige bg-brand-cream/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-moss/15 text-brand-moss">
                    <feature.icon size={22} strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-4 font-serif text-lg text-brand-forest">{feature.title}</h3>
                  <p className="mt-2 text-sm text-brand-graphite/75">{feature.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="section-padding bg-brand-sage/10">
        <div className="container-herbert grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <FadeIn direction="right">
            <SiteImage
              slot="terapia.fotobio"
              alt="Sessão de fotobiomodulação"
              placeholderTone="gold"
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="aspect-[4/3] w-full"
            />
          </FadeIn>
          <FadeIn direction="left">
            <div className="flex items-center gap-2.5">
              <Droplets size={18} className="text-brand-moss" />
              <p className="eyebrow">Fotobiomodulação em destaque</p>
            </div>
            <h2 className="mt-3 font-serif text-3xl text-brand-forest sm:text-4xl">
              Luz de baixa intensidade como parte do seu cuidado
            </h2>
            <p className="mt-5 text-brand-graphite/80">
              A fotobiomodulação é indicada dentro do protocolo individual de cada cliente,
              acompanhando a saúde do couro cabeludo ao longo das sessões. É mais uma ferramenta a
              serviço do seu bem-estar capilar — nunca um procedimento isolado ou padronizado.
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="section-padding relative overflow-hidden bg-white text-center">
        <ParallaxLeaf className="pointer-events-none absolute right-[10%] top-6 hidden sm:block" size={42} tone="moss" />
        <div className="container-herbert relative max-w-xl">
          <FadeIn>
            <h2 className="font-serif text-2xl text-brand-forest sm:text-3xl">
              Comece com uma avaliação individual
            </h2>
            <p className="mt-4 text-brand-graphite/75">
              Vamos conversar sobre a saúde do seu couro cabeludo e desenhar um protocolo só seu.
            </p>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
