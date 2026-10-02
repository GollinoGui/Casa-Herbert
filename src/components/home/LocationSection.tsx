import type { BusinessHourRule, Settings } from "@/types";
import { SectionHeading } from "@/components/ui/Card";
import { FadeIn } from "@/components/motion/FadeIn";
import { ScrollSlide } from "@/components/motion/ScrollSlide";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";
import { MarginThread } from "@/components/motion/MarginThread";
import { MapMockup } from "@/components/location/MapMockup";
import { VisitInfoCard } from "@/components/location/VisitInfoCard";

interface LocationSectionProps {
  settings: Settings;
  isOpen: boolean;
  businessHours: BusinessHourRule[];
}

export function LocationSection({ settings, isOpen, businessHours }: LocationSectionProps) {
  return (
    <section className="wave-top section-padding relative overflow-hidden bg-brand-cream bg-gradient-to-b from-brand-beige/25 to-brand-beige/25">
      <ParallaxLeaf className="pointer-events-none absolute -left-2 top-4 hidden sm:block" size={40} tone="moss" />
      <ParallaxLeaf className="pointer-events-none absolute -right-3 bottom-6 hidden sm:block" size={46} variant="branch" tone="moss" speed="slow" />
      <MarginThread side="left" tone="sage" className="top-10 bottom-10" />
      <MarginThread side="right" tone="sage" className="top-10 bottom-10" />
      <div className="container-herbert relative">
        <FadeIn>
          <SectionHeading eyebrow="Onde estamos" title="Venha nos visitar em Orlândia" />
        </FadeIn>

        <div className="mt-14 grid items-center gap-14 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
          <MapMockup />

          <ScrollSlide from="right">
            <VisitInfoCard address={settings.salonAddress} isOpen={isOpen} businessHours={businessHours} />
          </ScrollSlide>
        </div>
      </div>
    </section>
  );
}
