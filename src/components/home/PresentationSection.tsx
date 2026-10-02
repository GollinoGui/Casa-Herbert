import { HeartHandshake, Leaf, Sparkles } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Marker } from "@/components/motion/Marker";
import { GoldDivider } from "@/components/motion/GoldDivider";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";
import { MarginThread } from "@/components/motion/MarginThread";
import { ScrollSlide } from "@/components/motion/ScrollSlide";
import { SectionHeading } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

const HIGHLIGHTS = [
  { icon: HeartHandshake, label: "Acolhimento em cada visita" },
  { icon: Leaf, label: "Cuidado natural e individual" },
  { icon: Sparkles, label: "Sem fórmula fixa" },
];

const SLIDE_FROM = ["left", "up", "right"] as const;

export function PresentationSection() {
  return (
    <section className="wave-top-alt section-padding relative overflow-hidden bg-white">
      <p
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-6 hidden -translate-x-1/2 whitespace-nowrap font-serif text-[9rem] italic leading-none text-brand-forest/[0.035] sm:block lg:text-[11rem]"
      >
        Casa Herbert
      </p>
      <ParallaxLeaf className="pointer-events-none absolute -left-4 top-10 hidden sm:block" size={46} tone="moss" />
      <ParallaxLeaf className="pointer-events-none absolute -right-2 bottom-6 hidden sm:block" size={58} variant="branch" />
      <MarginThread side="left" tone="sage" className="top-8 bottom-8" />
      <MarginThread side="right" tone="sage" className="top-8 bottom-8" />
      <div className="container-herbert relative max-w-3xl text-center">
        <FadeIn>
          <SectionHeading
            eyebrow="Sobre a Casa Herbert"
            title="Um espaço dedicado ao cuidado individual"
            description={
              <>
                Na Casa Herbert, cada atendimento começa com uma conversa e uma avaliação individual
                do couro cabeludo e dos fios. <Marker>Não existe fórmula fixa</Marker>: existe escuta,
                observação e um protocolo pensado para a necessidade de cada cliente.
              </>
            }
          />
        </FadeIn>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
          {HIGHLIGHTS.map((item, index) => (
            <ScrollSlide key={item.label} from={SLIDE_FROM[index % SLIDE_FROM.length]}>
              <div className="flex items-center gap-2.5 text-sm font-medium text-brand-graphite/80">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-moss/15 text-brand-moss ring-1 ring-brand-moss/25">
                  <item.icon size={16} strokeWidth={1.5} />
                </span>
                {item.label}
              </div>
            </ScrollSlide>
          ))}
        </div>

        <FadeIn delay={0.15}>
          <GoldDivider className="mt-10" />
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="mt-8">
            <LinkButton href="/sobre" variant="secondary">
              Saiba mais
            </LinkButton>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
