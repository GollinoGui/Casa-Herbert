import type { Service } from "@/types";
import { SectionHeading } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { CoverflowCarousel, type CoverflowCarouselItem } from "@/components/ui/CoverflowCarousel";
import { FadeIn } from "@/components/motion/FadeIn";
import { formatServiceDuration } from "@/lib/utils/service-format";

const placeholderTones: CoverflowCarouselItem["placeholderTone"][] = ["sage", "cream", "gold"];

// Fotos reais já recebidas, por slug do serviço. Os demais continuam com PlaceholderImage
// até termos a foto correspondente (ver CLAUDE.md > Fotos).
const serviceImages: Record<string, { src: string; position?: string }> = {
  velaterapia: { src: "/images/servicos/velaterapia.jpg", position: "bottom" },
};

export function ServicesPreviewSection({ services }: { services: Service[] }) {
  const preview = services.slice(0, 6);
  if (preview.length === 0) return null;

  const items: CoverflowCarouselItem[] = preview.map((service, idx) => {
    const image = serviceImages[service.slug];
    return {
      id: service.id,
      tag: formatServiceDuration(service.durationMinutes),
      titleLine1: service.name,
      desc: service.description,
      ctaText: "Saiba mais",
      ctaUrl: "/servicos",
      placeholderTone: placeholderTones[idx % placeholderTones.length],
      imageSrc: image?.src,
      imagePosition: image?.position,
    };
  });

  return (
    <section className="section-padding bg-brand-cream">
      <div className="container-herbert">
        <FadeIn>
          <SectionHeading
            eyebrow="Nossos cuidados"
            title="Cuidados pensados para você"
            description="Uma seleção dos protocolos e serviços oferecidos na Casa Herbert — todos iniciados por uma avaliação individual."
          />
        </FadeIn>
      </div>

      {/* Fora do container-herbert de propósito: o palco 3D precisa da largura cheia
          da seção para os cards das pontas não serem cortados pelo max-w do container. */}
      <FadeIn delay={0.1}>
        <CoverflowCarousel items={items} className="mt-14" />
      </FadeIn>

      <div className="container-herbert">
        <FadeIn delay={0.2} className="mt-12 text-center">
          <LinkButton href="/servicos" variant="secondary">
            Ver todos os cuidados
          </LinkButton>
        </FadeIn>
      </div>
    </section>
  );
}
