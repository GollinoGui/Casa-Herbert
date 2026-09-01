import type { GalleryItem } from "@/types";
import { SectionHeading } from "@/components/ui/Card";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { FadeIn } from "@/components/motion/FadeIn";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";
import { MarginThread } from "@/components/motion/MarginThread";
import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerChildren";
import { TiltCard } from "@/components/motion/TiltCard";

export function ResultsPreviewSection({ galleryItems }: { galleryItems: GalleryItem[] }) {
  const results = galleryItems.filter((g) => g.category === "resultados");
  if (results.length === 0) return null;

  const mainResults = results.slice(0, 3);
  const highlightedResults = results.slice(3, 5);

  return (
    <section id="resultados" className="section-padding relative scroll-mt-28 overflow-hidden bg-white">
      <ParallaxLeaf className="pointer-events-none absolute -right-4 top-10 hidden sm:block" size={48} tone="moss" />
      <ParallaxLeaf className="pointer-events-none absolute -left-3 bottom-14 hidden sm:block" size={40} variant="branch" speed="slow" />
      {highlightedResults.length > 0 && (
        <div className="pointer-events-none absolute -right-10 bottom-0 h-72 w-72 rounded-full bg-brand-gold/20 blur-3xl" />
      )}
      <MarginThread side="left" tone="sage" className="top-10 bottom-10" />
      <MarginThread side="right" tone="sage" className="top-10 bottom-10" />
      <div className="container-herbert relative">
        <FadeIn>
          <SectionHeading
            eyebrow="Resultados"
            title="Acompanhamento que se reflete nos fios"
            description="Uma seleção de registros do acompanhamento de cuidado capilar realizado na Casa Herbert."
          />
        </FadeIn>

        <StaggerContainer className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {mainResults.map((item) => (
            <StaggerItem key={item.id}>
              <TiltCard className="group rounded-2xl">
                <PlaceholderImage
                  label={item.caption ?? "Resultado do acompanhamento"}
                  tone="sage"
                  className="aspect-square w-full ring-1 ring-brand-sage/30 transition-transform duration-500 group-hover:scale-105"
                />
              </TiltCard>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {highlightedResults.length > 0 && (
          <StaggerContainer className="relative mt-6 flex justify-end gap-5 sm:mt-8">
            {highlightedResults.map((item) => (
              <StaggerItem key={item.id} className="w-[calc(50%-0.625rem)] sm:w-48 lg:w-56">
                <TiltCard className="group rounded-2xl">
                  <PlaceholderImage
                    label={item.caption ?? "Resultado do acompanhamento"}
                    tone="gold"
                    className="aspect-square w-full ring-2 ring-brand-gold/50 transition-transform duration-500 group-hover:scale-105"
                  />
                </TiltCard>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}

        <FadeIn delay={0.2} className="mt-12 text-center">
          <p className="mx-auto max-w-xl text-sm text-brand-graphite/60">
            Esta galeria é gerenciada pela Casa Herbert e será atualizada com fotografias reais dos
            acompanhamentos ao longo do tempo.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
