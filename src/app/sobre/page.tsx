import type { Metadata } from "next";
import { HeartHandshake, Leaf, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/ui/Card";
import { SiteImage } from "@/components/ui/SiteImage";
import { LinkButton } from "@/components/ui/Button";
import { FadeIn } from "@/components/motion/FadeIn";
import { CurtainReveal } from "@/components/motion/CurtainReveal";
import { Marker } from "@/components/motion/Marker";
import { TypewriterText } from "@/components/motion/TypewriterText";
import { WordsRise } from "@/components/motion/WordsRise";
import { DominoCard } from "@/components/motion/DominoCard";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";
import { GoldDivider } from "@/components/motion/GoldDivider";
import { AttendanceJourneySection } from "@/components/sobre/AttendanceJourneySection";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "Conheça a Casa Herbert em Orlândia/SP: um espaço de cuidado individual dedicado à saúde capilar, onde cada atendimento começa com conversa e avaliação personalizada.",
};

const VALUES = [
  {
    icon: HeartHandshake,
    title: "Acolhimento",
    description: "Um ambiente pensado para que você se sinta ouvida em cada visita.",
  },
  {
    icon: Leaf,
    title: "Cuidado natural",
    description: "Protocolos que respeitam o tempo e as características de cada couro cabeludo.",
  },
  {
    icon: Sparkles,
    title: "Individualidade",
    description: "Nenhum atendimento é igual ao outro — tudo parte da sua avaliação.",
  },
];

export default function SobrePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-cream to-brand-sage/15 pb-16 pt-14 sm:pb-20 sm:pt-20">
        <ParallaxLeaf className="pointer-events-none absolute -left-4 top-10 hidden sm:block" size={80} speed="slow" />
        <ParallaxLeaf className="pointer-events-none absolute right-4 bottom-4 hidden md:block" size={60} variant="branch" />
        <div className="container-herbert relative grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="eyebrow mb-4">
              <TypewriterText text="Sobre nós" />
            </p>
            <WordsRise
              as="h1"
              trigger="load"
              text="Um espaço de cuidado individual para a sua saúde capilar"
              delay={0.1}
              className="font-serif text-4xl leading-tight text-brand-forest sm:text-5xl"
            />
            <FadeIn trigger="load" delay={0.6}>
            <p className="mt-6 max-w-lg text-brand-graphite/80">
              A Casa Herbert nasceu do desejo de oferecer um cuidado capilar próximo, atento e
              verdadeiramente individual — em que cada pessoa é ouvida antes de qualquer protocolo
              ser pensado.
            </p>
            </FadeIn>
          </div>
          <CurtainReveal mode="load" delay={0.15}>
            <SiteImage
              slot="sobre.retrato"
              alt="Retrato Casa Herbert"
              placeholderTone="gold"
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="aspect-[4/5] w-full"
              priority
            />
          </CurtainReveal>
        </div>
      </section>

      <section className="section-padding relative overflow-hidden bg-white">
        <ParallaxLeaf className="pointer-events-none absolute -right-4 top-10 hidden sm:block" size={46} tone="moss" />
        <div className="container-herbert relative max-w-3xl">
          <FadeIn>
            <SectionHeading
              eyebrow="Nossa forma de cuidar"
              title="Cada visita começa com uma conversa"
              align="left"
            />
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="mt-6 space-y-5 text-brand-graphite/80">
              <p>
                Antes de qualquer procedimento, reservamos um momento para conversar. Queremos
                entender sua rotina, sua relação com o cabelo e o que te motivou a buscar
                acompanhamento. É a partir dessa escuta que construímos uma avaliação individual
                do couro cabeludo e dos fios.
              </p>
              <p>
                <Marker>Não trabalhamos com pacotes fechados ou fórmulas padronizadas.</Marker> Cada protocolo de
                cuidado é desenhado a partir da necessidade específica de cada cliente, respeitando
                o tempo e as particularidades de cada pessoa.
              </p>
              <p>
                São anos de dedicação ao cuidado capilar que moldaram a forma como recebemos cada
                cliente na Casa Herbert: com atenção, paciência e acompanhamento contínuo — porque{" "}
                <Marker tone="gold">cuidar do seu couro cabeludo é cuidar de você</Marker>.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      <AttendanceJourneySection />

      <section className="section-padding relative overflow-hidden bg-gradient-to-b from-brand-cream via-brand-cream to-brand-beige/50">
        <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-brand-sage/20 blur-3xl" />
        <div className="container-herbert relative">
          <FadeIn>
            <SectionHeading eyebrow="O que nos guia" title="Valores que estão em cada atendimento" />
          </FadeIn>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {VALUES.map((value) => (
              <DominoCard key={value.title}>
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-moss/15 text-brand-moss ring-1 ring-brand-moss/25">
                    <value.icon size={26} strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-5 font-serif text-lg text-brand-forest">{value.title}</h3>
                  <p className="mt-2 text-sm text-brand-graphite/75">{value.description}</p>
                </div>
              </DominoCard>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding relative overflow-hidden bg-white text-center">
        <ParallaxLeaf className="pointer-events-none absolute left-[10%] bottom-6 hidden sm:block" size={40} variant="leaf" />
        <div className="container-herbert relative max-w-xl">
          <FadeIn>
            <GoldDivider className="mb-8" />
            <h2 className="font-serif text-2xl text-brand-forest sm:text-3xl">
              Vamos começar sua avaliação individual?
            </h2>
            <div className="mt-8">
              <LinkButton href="/agendar" variant="primary">
                Agendar avaliação
              </LinkButton>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
