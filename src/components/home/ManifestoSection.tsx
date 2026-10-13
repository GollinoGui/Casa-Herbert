import { FadeIn } from "@/components/motion/FadeIn";
import { Marker } from "@/components/motion/Marker";
import { GoldDivider } from "@/components/motion/GoldDivider";

export function ManifestoSection() {
  return (
    <section className="wave-top relative overflow-hidden bg-brand-cream py-16 sm:py-20">
      <div className="container-herbert relative max-w-3xl text-center">
        <FadeIn>
          <GoldDivider className="mb-8" />
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="text-balance font-serif text-2xl leading-snug text-brand-forest sm:text-3xl lg:text-[2.1rem]">
            Antes de qualquer protocolo, existe uma conversa. Antes de qualquer fórmula, existe escuta.
          </p>
        </FadeIn>
        <FadeIn delay={0.25}>
          <p className="mx-auto mt-6 max-w-xl text-brand-graphite/75">
            É assim que cuidamos da sua saúde capilar — sem pressa e <Marker>sempre a partir de você</Marker>.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
