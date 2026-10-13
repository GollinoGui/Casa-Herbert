import type { BusinessHourRule, Settings } from "@/types";
import { SectionHeading } from "@/components/ui/Card";
import { FadeIn } from "@/components/motion/FadeIn";
import { ScrollSlide } from "@/components/motion/ScrollSlide";
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
