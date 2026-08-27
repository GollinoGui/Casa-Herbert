import { FadeIn } from "@/components/motion/FadeIn";
import { GoldDivider } from "@/components/motion/GoldDivider";
import { SectionHeading } from "@/components/ui/Card";

export function PresentationSection() {
  return (
    <section className="section-padding bg-white">
      <div className="container-herbert max-w-3xl text-center">
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
