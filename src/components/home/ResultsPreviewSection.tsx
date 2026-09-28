import Image from "next/image";
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

  return (
    <section id="resultados" className="section-padding relative scroll-mt-28 overflow-hidden bg-white">
      <ParallaxLeaf className="pointer-events-none absolute -right-4 top-10 hidden sm:block" size={48} tone="moss" />
      <ParallaxLeaf className="pointer-events-none absolute -left-3 bottom-14 hidden sm:block" size={40} variant="branch" speed="slow" />
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

        {/* flex-wrap em vez de grid: a quantidade vem do admin, e a última linha incompleta fica centralizada */}
        <StaggerContainer className="mt-12 flex flex-wrap justify-center gap-5">
          {results.map((item) => (
            <StaggerItem
              key={item.id}
              className="w-full sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)]"
            >
              <TiltCard className="group rounded-2xl">
                {item.imageUrl ? (
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl ring-1 ring-brand-sage/30 transition-transform duration-500 group-hover:scale-105">
                    <Image
                      src={item.imageUrl}
                      alt={item.caption ?? "Resultado do acompanhamento"}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <PlaceholderImage
                    label={item.caption ?? "Resultado do acompanhamento"}
                    tone="sage"
                    className="aspect-square w-full ring-1 ring-brand-sage/30 transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </TiltCard>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {results.some((item) => item.imageUrl) ? null : (
          <FadeIn delay={0.2} className="mt-12 text-center">
            <p className="mx-auto max-w-xl text-sm text-brand-graphite/60">
              Esta galeria é gerenciada pela Casa Herbert e será atualizada com fotografias reais dos
              acompanhamentos ao longo do tempo.
            </p>
          </FadeIn>
        )}
      </div>
    </section>
  );
}
