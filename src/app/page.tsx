import type { Metadata } from "next";
import { getSettings } from "@/lib/data/settings";
import { getActiveServices } from "@/lib/data/services";
import { getPublishedTestimonials } from "@/lib/data/testimonials";
import { getPublishedGallery } from "@/lib/data/gallery";
import { IntroReveal } from "@/components/motion/IntroReveal";
import { HeroSection } from "@/components/home/HeroSection";
import { ManifestoSection } from "@/components/home/ManifestoSection";
import { PresentationSection } from "@/components/home/PresentationSection";
import { ServicesPreviewSection } from "@/components/home/ServicesPreviewSection";
import { PersonalizedEvaluationSection } from "@/components/home/PersonalizedEvaluationSection";
import { TherapyPhotobioSection } from "@/components/home/TherapyPhotobioSection";
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

export default async function HomePage() {
  const [settings, services, testimonials, gallery] = await Promise.all([
    getSettings(),
    getActiveServices(),
    getPublishedTestimonials(),
    getPublishedGallery(),
  ]);

  return (
    <IntroReveal>
      <HeroSection />
      <ManifestoSection />
      <PresentationSection />
      <ServicesPreviewSection
        services={services}
        whatsappNumber={settings.whatsappNumber}
        minAdvanceDays={settings.minAdvanceDays}
      />
      <PersonalizedEvaluationSection />
      <TherapyPhotobioSection />
      <ResultsPreviewSection galleryItems={gallery} />
      <TestimonialsSection testimonials={testimonials} />
      <ProductsPreviewSection whatsappNumber={settings.whatsappNumber} />
      <LocationSection settings={settings} />
      <FinalCtaSection whatsappNumber={settings.whatsappNumber} />
    </IntroReveal>
  );
}
