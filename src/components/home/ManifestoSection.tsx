import { FadeIn } from "@/components/motion/FadeIn";
import { GoldDivider } from "@/components/motion/GoldDivider";
import { MarginThread } from "@/components/motion/MarginThread";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";

export function ManifestoSection() {
  return (
    <section className="relative overflow-hidden bg-brand-cream py-16 sm:py-20">
      <ParallaxLeaf className="pointer-events-none absolute left-[8%] top-6 hidden sm:block" size={38} tone="moss" speed="slow" />
      <ParallaxLeaf className="pointer-events-none absolute right-[10%] bottom-4 hidden sm:block" size={34} variant="leaf" />
      <MarginThread side="left" tone="sage" className="top-8 bottom-8" />
      <MarginThread side="right" tone="sage" className="top-8 bottom-8" />
      <div className="container-herbert relative max-w-3xl text-center">
        <FadeIn>
          <GoldDivider className="mb-8" />
        </FadeIn>
        <div className="font-serif text-2xl leading-snug text-brand-forest sm:text-3xl lg:text-[2.1rem]">
          <FadeIn delay={0.08}>
            <p>Antes de qualquer protocolo, existe uma conversa.</p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <p>Antes de qualquer fórmula, existe escuta.</p>
          </FadeIn>
        </div>
        <FadeIn delay={0.5}>
          <p className="mx-auto mt-6 max-w-xl text-brand-graphite/70">
            É assim que cuidamos da sua saúde capilar na Casa Herbert — sem pressa, sem fórmula
            fixa, sempre a partir de você.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
