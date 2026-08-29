import { MessageCircle, Search, Sparkles } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/Card";
import { FadeIn } from "@/components/motion/FadeIn";
import { GrowLine } from "@/components/motion/GrowLine";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";
import { FloatingIcon } from "@/components/motion/FloatingIcon";
import { MarginThread } from "@/components/motion/MarginThread";

const STEPS = [
  {
    number: "01",
    icon: MessageCircle,
    title: "Conversa inicial",
    description: "Ouvimos sua história, sua rotina e o que te trouxe até a Casa Herbert.",
  },
  {
    number: "02",
    icon: Search,
    title: "Avaliação individual",
    description: "Observamos o couro cabeludo e os fios com atenção, sem pressa e sem fórmulas prontas.",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Protocolo personalizado",
    description: "Definimos juntos um caminho de cuidado alinhado à sua necessidade específica.",
  },
];

export function PersonalizedEvaluationSection() {
  return (
    <section className="section-padding relative overflow-hidden bg-gradient-to-b from-white via-brand-sage/10 to-white">
      <ParallaxLeaf className="pointer-events-none absolute left-[6%] top-6 hidden sm:block" size={44} tone="moss" speed="slow" />
      <ParallaxLeaf className="pointer-events-none absolute right-[8%] bottom-4 hidden sm:block" size={52} variant="leaf" />
      <FloatingIcon icon={Sparkles} size={26} speed="slow" className="pointer-events-none absolute right-8 top-10 hidden text-brand-gold/40 lg:block" />
      <MarginThread side="left" tone="sage" className="top-10 bottom-10" />
      <MarginThread side="right" tone="sage" className="top-10 bottom-10" />
      <div className="container-herbert relative">
        <FadeIn>
          <SectionHeading
            eyebrow="O diferencial Casa Herbert"
            title="Nada de fórmula fixa: cada atendimento começa com você"
            description="Antes de qualquer protocolo, dedicamos tempo a entender a sua saúde capilar. É essa avaliação individual que orienta cada decisão de cuidado."
          />
        </FadeIn>

        <div className="mt-14 flex items-center justify-center">
          {STEPS.map((step, index) => (
            <div key={step.title} className="flex items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-moss/15 text-brand-moss ring-1 ring-brand-moss/25">
                <step.icon size={26} strokeWidth={1.5} />
              </div>
              {index < STEPS.length - 1 && (
                <GrowLine
                  direction="horizontal"
                  className="mx-2 h-px w-10 bg-gradient-to-r from-brand-gold/70 to-brand-gold/15 sm:mx-4 sm:w-20"
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <FadeIn key={step.title} delay={index * 0.08}>
              <div className="relative flex flex-col items-center text-center">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 select-none font-serif text-6xl text-brand-forest/[0.06]"
                >
                  {step.number}
                </span>
                <p className="relative text-xs font-medium uppercase tracking-[0.2em] text-brand-gold">
                  Passo {index + 1}
                </p>
                <h3 className="relative mt-2 font-serif text-lg text-brand-forest">{step.title}</h3>
                <p className="relative mt-2 text-sm text-brand-graphite/75">{step.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.3}>
          <div className="mt-12 text-center">
            <LinkButton href="/sobre" variant="secondary">
              Conhecer nossa jornada completa
            </LinkButton>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
