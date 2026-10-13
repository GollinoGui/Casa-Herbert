import type { Metadata } from "next";
import { getSettings } from "@/lib/data/settings";
import { getActiveServices } from "@/lib/data/services";
import { getPublishedTestimonials } from "@/lib/data/testimonials";
import { getPublishedGallery } from "@/lib/data/gallery";
import { getShowcaseProducts } from "@/lib/data/products";
import { getBusinessHours, isOpenNow } from "@/lib/data/business-hours";
import { findNextOpenings } from "@/lib/data/availability";
import { todayDateStr } from "@/lib/utils/date-format";
import type { Service } from "@/types";
import { IntroReveal } from "@/components/motion/IntroReveal";
import { HeroSection, type NextOpenings } from "@/components/home/HeroSection";
import { ManifestoSection } from "@/components/home/ManifestoSection";
import { HerbertSection } from "@/components/home/HerbertSection";
import { ServicesPreviewSection } from "@/components/home/ServicesPreviewSection";
import { FirstVisitSection } from "@/components/home/FirstVisitSection";
import { ScalpQuizSection } from "@/components/home/ScalpQuizSection";
import { TrichoscopySection } from "@/components/home/TrichoscopySection";
import { FaqSection } from "@/components/home/FaqSection";
import { ResultsPreviewSection } from "@/components/home/ResultsPreviewSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { ProductsPreviewSection } from "@/components/home/ProductsPreviewSection";
import { LocationSection } from "@/components/home/LocationSection";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";

export const metadata: Metadata = {
  title: {
    absolute: "Casa Herbert — Embelezamento e Saúde Capilar em Orlândia/SP",
  },
  description:
    "Casa Herbert Orlândia: terapia capilar, saúde capilar e cuidados com o couro cabeludo a partir de uma avaliação individual. Cuidar do seu couro cabeludo é cuidar de você.",
};

// Os horários livres do topo usam a avaliação — a porta de entrada da casa.
const EVALUATION_SLUG = "avaliacao-capilar";
const HERO_OPENINGS = 4;

async function getNextOpenings(evaluation: Service | undefined): Promise<NextOpenings | null> {
  if (!evaluation) return null;
  const openings = await findNextOpenings(todayDateStr(), evaluation.id, HERO_OPENINGS);
  return openings.length > 0 ? { serviceId: evaluation.id, serviceName: evaluation.name, openings } : null;
}

export default async function HomePage() {
  const [settings, services, testimonials, gallery, isOpen, businessHours, products] = await Promise.all([
    getSettings(),
    getActiveServices(),
    getPublishedTestimonials(),
    getPublishedGallery(),
    isOpenNow(),
    getBusinessHours(),
    getShowcaseProducts(),
  ]);

  const evaluation = services.find((s) => s.slug === EVALUATION_SLUG) ?? services[0];
  const nextOpenings = await getNextOpenings(evaluation);

  return (
    <IntroReveal>
      <HeroSection nextOpenings={nextOpenings} />
      <ManifestoSection />
      <HerbertSection />
      <ServicesPreviewSection
        services={services}
        whatsappNumber={settings.whatsappNumber}
        minAdvanceDays={settings.minAdvanceDays}
      />
      {/* Logo depois dos cuidados: é a seção que aparece atrás do papel cortado (data-cut-reveal). */}
      <FirstVisitSection />
      <ScalpQuizSection services={services} evaluationServiceId={evaluation?.id ?? null} />
      <TrichoscopySection />
      <ResultsPreviewSection galleryItems={gallery} />
      <TestimonialsSection testimonials={testimonials} />
      <FaqSection />
      <ProductsPreviewSection whatsappNumber={settings.whatsappNumber} products={products} />
      <LocationSection settings={settings} isOpen={isOpen} businessHours={businessHours} />
      <FinalCtaSection settings={settings} />
    </IntroReveal>
  );
}
