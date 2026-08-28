import { FadeIn } from "@/components/motion/FadeIn";
import { GoldDivider } from "@/components/motion/GoldDivider";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";
import { SectionHeading } from "@/components/ui/Card";

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
        <FadeIn delay={0.15}>
          <GoldDivider className="mt-8" />
        </FadeIn>
      </div>
    </section>
  );
}
