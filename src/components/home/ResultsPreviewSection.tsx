import type { GalleryItem } from "@/types";
import { SectionHeading } from "@/components/ui/Card";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { FadeIn } from "@/components/motion/FadeIn";
import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerChildren";

export function ResultsPreviewSection({ galleryItems }: { galleryItems: GalleryItem[] }) {
  const results = galleryItems.filter((g) => g.category === "resultados");
  if (results.length === 0) return null;

  return (
    <section id="resultados" className="section-padding scroll-mt-28 bg-white">
      <div className="container-herbert">
        <FadeIn>
          <SectionHeading
            eyebrow="Resultados"
            title="Acompanhamento que se reflete nos fios"
            description="Uma seleção de registros do acompanhamento de cuidado capilar realizado na Casa Herbert."
          />
        </FadeIn>

        <StaggerContainer className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {results.map((item) => (
            <StaggerItem key={item.id}>
              <PlaceholderImage
                label={item.caption ?? "Resultado do acompanhamento"}
                tone="sage"
                className="aspect-square w-full"
              />
            </StaggerItem>
          ))}
        </StaggerContainer>

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
