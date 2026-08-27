import { MessageCircle, Search, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/ui/Card";
import { FadeIn } from "@/components/motion/FadeIn";
import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerChildren";

const STEPS = [
  {
    icon: MessageCircle,
    title: "Conversa inicial",
    description: "Ouvimos sua história, sua rotina e o que te trouxe até a Casa Herbert.",
  },
  {
    icon: Search,
    title: "Avaliação individual",
    description: "Observamos o couro cabeludo e os fios com atenção, sem pressa e sem fórmulas prontas.",
  },
  {
    icon: Sparkles,
    title: "Protocolo personalizado",
    description: "Definimos juntos um caminho de cuidado alinhado à sua necessidade específica.",
  },
];

export function PersonalizedEvaluationSection() {
  return (
    <section className="section-padding bg-white">
      <div className="container-herbert">
        <FadeIn>
          <SectionHeading
            eyebrow="O diferencial Casa Herbert"
            title="Nada de fórmula fixa: cada atendimento começa com você"
            description="Antes de qualquer protocolo, dedicamos tempo a entender a sua saúde capilar. É essa avaliação individual que orienta cada decisão de cuidado."
          />
        </FadeIn>

        <StaggerContainer className="mt-14 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <StaggerItem key={step.title}>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-sage/20 text-brand-forest">
                  <step.icon size={26} strokeWidth={1.5} />
                </div>
                <p className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-brand-gold">
                  Passo {index + 1}
                </p>
                <h3 className="mt-2 font-serif text-lg text-brand-forest">{step.title}</h3>
                <p className="mt-2 text-sm text-brand-graphite/75">{step.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
