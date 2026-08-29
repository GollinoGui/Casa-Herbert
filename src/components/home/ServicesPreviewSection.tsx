"use client";

import { useState } from "react";
import type { Service } from "@/types";
import { SectionHeading } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { CoverflowCarousel, type CoverflowCarouselItem } from "@/components/ui/CoverflowCarousel";
import { FadeIn } from "@/components/motion/FadeIn";
import { MarginThread } from "@/components/motion/MarginThread";
import { formatServiceDuration } from "@/lib/utils/service-format";
import { ServiceDetailModal } from "@/components/services/ServiceDetailModal";
import { BookingModal } from "@/components/booking/BookingModal";

const placeholderTones: CoverflowCarouselItem["placeholderTone"][] = ["sage", "cream", "gold"];

// Fotos reais já recebidas, por slug do serviço. Os demais continuam com PlaceholderImage
// até termos a foto correspondente (ver CLAUDE.md > Fotos).
const serviceImages: Record<string, { src: string; position?: string }> = {
  velaterapia: { src: "/images/servicos/velaterapia.jpg", position: "bottom" },
  "terapia-capilar": { src: "/images/servicos/terapia-capilar.jpg" },
  fotobiomodulacao: { src: "/images/servicos/fotobiomodulacao.jpg" },
};

interface ServicesPreviewSectionProps {
  services: Service[];
  whatsappNumber: string;
  minAdvanceDays: number;
}

export function ServicesPreviewSection({ services, whatsappNumber, minAdvanceDays }: ServicesPreviewSectionProps) {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingServiceId, setBookingServiceId] = useState<string | null>(null);

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
      onCtaClick: () => setSelectedService(service),
      placeholderTone: placeholderTones[idx % placeholderTones.length],
      imageSrc: image?.src,
      imagePosition: image?.position,
    };
  });

  return (
    <section
      id="nossos-cuidados"
      className="section-padding relative scroll-mt-28 overflow-hidden bg-gradient-to-b from-brand-cream via-brand-cream to-brand-beige/60"
    >
      <div className="pointer-events-none absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-brand-sage/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-brand-gold/15 blur-3xl" />
      <MarginThread side="left" tone="gold" className="top-8 bottom-8" />
      <MarginThread side="right" tone="gold" className="top-8 bottom-8" />
      <div className="container-herbert relative">
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

      <ServiceDetailModal
        service={selectedService}
        whatsappNumber={whatsappNumber}
        onClose={() => setSelectedService(null)}
        onSchedule={(service) => {
          setSelectedService(null);
          setBookingServiceId(service.id);
        }}
      />

      <BookingModal
        open={bookingServiceId !== null}
        onClose={() => setBookingServiceId(null)}
        services={services}
        minAdvanceDays={minAdvanceDays}
        preselectedServiceId={bookingServiceId ?? undefined}
      />
    </section>
  );
}
