import type { LucideIcon } from "lucide-react";
import { MessageCircle, Repeat, Search, Sparkles } from "lucide-react";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { SectionHeading } from "@/components/ui/Card";
import { FadeIn } from "@/components/motion/FadeIn";
import { GrowLine } from "@/components/motion/GrowLine";

interface JourneyStep {
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  imageLabel: string;
  tone: "sage" | "cream" | "gold";
}

const STEPS: JourneyStep[] = [
  {
    icon: MessageCircle,
    label: "Etapa 1",
    title: "Conversa inicial",
    description: "Ouvimos sua história, sua rotina e o que te trouxe até a Casa Herbert.",
    imageLabel: "Conversa inicial",
    tone: "sage",
  },
  {
    icon: Search,
    label: "Etapa 2",
    title: "Avaliação individual",
    description: "Observamos o couro cabeludo e os fios com atenção, sem pressa e sem fórmulas prontas.",
    imageLabel: "Avaliação capilar",
    tone: "gold",
  },
  {
    icon: Sparkles,
    label: "Etapa 3",
    title: "Protocolo personalizado",
    description: "Definimos juntos um caminho de cuidado alinhado à sua necessidade específica.",
    imageLabel: "Protocolo personalizado",
    tone: "cream",
  },
  {
    icon: Repeat,
    label: "Etapa 4",
    title: "Acompanhamento contínuo",
    description: "Retornamos, ajustamos e seguimos cuidando — o protocolo evolui com você ao longo do tempo.",
    imageLabel: "Retorno de acompanhamento",
    tone: "sage",
  },
];

/** Timeline vertical: cada etapa entra conforme a pessoa rola até ela (whileInView
 * individual, não um stagger disparado de uma vez), e o traço que liga os passos
 * cresce de cima para baixo junto com a rolagem. A foto de cada etapa aparece no
 * hover em telas com mouse; no touch, sem hover, ela já fica sempre visível. */
export function AttendanceJourneySection() {
  return (
    <section className="section-padding relative bg-brand-beige/20">
      <div className="container-herbert relative max-w-2xl">
        <FadeIn>
          <SectionHeading eyebrow="Como cuidamos" title="Sua jornada de cuidado na Casa Herbert" />
        </FadeIn>
        <FadeIn delay={0.05}>
          <p className="mx-auto -mt-2 max-w-xl text-center text-brand-graphite/80">
            Da primeira conversa ao acompanhamento contínuo — cada etapa existe para que o protocolo
            faça sentido pra você.{" "}
            <span className="hidden lg:inline">Passe o mouse sobre cada uma para ver um pouco mais.</span>
          </p>
        </FadeIn>

        <div className="relative mt-16">
          <GrowLine className="absolute bottom-0 left-7 top-0 w-px bg-gradient-to-b from-brand-gold via-brand-gold/60 to-transparent" />

          <ol className="relative flex flex-col gap-12">
            {STEPS.map((step, index) => (
              <FadeIn key={step.title} delay={index === 0 ? 0 : 0.05}>
                <li className="group relative flex gap-5">
                  <div className="relative shrink-0">
                    <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-brand-moss/15 text-brand-moss ring-4 ring-brand-beige/20">
                      <step.icon size={24} strokeWidth={1.5} />
                    </span>

                    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-4 hidden w-48 -translate-x-1/2 scale-95 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100 lg:block">
                      <PlaceholderImage
                        label={step.imageLabel}
                        tone={step.tone}
                        className="aspect-[4/3] w-full shadow-md ring-1 ring-brand-beige"
                      />
                    </div>
                  </div>

                  <div className="flex-1 pt-1.5">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-gold">{step.label}</p>
                    <h3 className="mt-1 font-serif text-lg text-brand-forest">{step.title}</h3>
                    <p className="mt-1.5 text-sm text-brand-graphite/75">{step.description}</p>
                    <PlaceholderImage
                      label={step.imageLabel}
                      tone={step.tone}
                      className="mt-3 aspect-[4/3] w-32 lg:hidden"
                    />
                  </div>
                </li>
              </FadeIn>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
