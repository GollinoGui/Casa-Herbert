import { MessageCircle, Search, Sparkles } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/Card";
import { FadeIn } from "@/components/motion/FadeIn";
import { StepConnector } from "@/components/motion/StepConnector";
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

        <StepConnector
          icons={STEPS.map((step) => (
            <step.icon key={step.title} size={26} strokeWidth={1.5} />
          ))}
          className="mt-14 hidden items-center justify-center sm:flex"
        />

        <div className="mt-12 grid gap-10 sm:mt-8 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step, index) => (
            <FadeIn key={step.title} delay={index * 0.08}>
              <div className="relative flex flex-col items-center text-center">
                <span className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-moss/15 text-brand-moss ring-1 ring-brand-moss/25 sm:hidden">
                  <step.icon size={22} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-3 left-1/2 hidden -translate-x-1/2 select-none font-serif text-6xl sm:block text-brand-forest/[0.06]"
                >
                  {step.number}
                </span>
                <p className="relative text-xs font-medium uppercase tracking-[0.2em] text-brand-gold">
                  Passo {index + 1}
                </p>
                <h3 className="relative mt-2 font-serif text-lg text-brand-forest">{step.title}</h3>
                <p className="relative mt-2 max-w-xs text-sm text-brand-graphite/75">{step.description}</p>
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
