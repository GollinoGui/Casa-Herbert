import { HeartHandshake, Leaf, Sparkles } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";
import { GoldDivider } from "@/components/motion/GoldDivider";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";
import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerChildren";
import { SectionHeading } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

const HIGHLIGHTS = [
  { icon: HeartHandshake, label: "Acolhimento em cada visita" },
  { icon: Leaf, label: "Cuidado natural e individual" },
  { icon: Sparkles, label: "Sem fórmula fixa" },
];

export function PresentationSection() {
  return (
    <section className="section-padding relative overflow-hidden bg-white">
      <ParallaxLeaf className="pointer-events-none absolute -left-4 top-10 hidden sm:block" size={46} tone="moss" />
      <ParallaxLeaf className="pointer-events-none absolute -right-2 bottom-6 hidden sm:block" size={58} variant="branch" />
      <div className="container-herbert relative max-w-3xl text-center">
        <FadeIn>
          <SectionHeading
            eyebrow="Sobre a Casa Herbert"
            title="Um espaço dedicado ao cuidado individual"
            description="Na Casa Herbert, cada atendimento começa com uma conversa e uma avaliação individual do couro cabeludo e dos fios. Não existe fórmula fixa: existe escuta, observação e um protocolo pensado para a necessidade de cada cliente."
          />
        </FadeIn>

        <StaggerContainer className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
          {HIGHLIGHTS.map((item) => (
            <StaggerItem key={item.label}>
              <div className="flex items-center gap-2.5 text-sm font-medium text-brand-graphite/80">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-moss/15 text-brand-moss ring-1 ring-brand-moss/25">
                  <item.icon size={16} strokeWidth={1.5} />
                </span>
                {item.label}
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

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
