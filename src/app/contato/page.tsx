import type { Metadata } from "next";
import { Facebook, Instagram, MessageCircle } from "lucide-react";
import { getSettings } from "@/lib/data/settings";
import { getBusinessHours, isOpenNow } from "@/lib/data/business-hours";
import { SectionHeading } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { PhoneCarousel, type PhoneCarouselItem } from "@/components/ui/PhoneCarousel";
import { MapMockup } from "@/components/location/MapMockup";
import { VisitInfoCard } from "@/components/location/VisitInfoCard";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";
import { formatPhoneDisplay, toWhatsAppDigits } from "@/lib/utils/phone";

export const metadata: Metadata = {
  title: "Contato",
  description:
    "Fale com a Casa Herbert em Orlândia/SP: endereço, horário de atendimento e WhatsApp para agendar sua avaliação de saúde capilar.",
};

export default async function ContatoPage() {
  const [settings, isOpen, businessHours] = await Promise.all([getSettings(), isOpenNow(), getBusinessHours()]);

  const socialChannels: PhoneCarouselItem[] = [
    {
      id: "instagram",
      label: "Instagram",
      handle: "@casaherbert",
      href: "https://instagram.com",
      icon: Instagram,
      tone: "gold",
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      handle: formatPhoneDisplay(settings.whatsappNumber),
      href: `https://wa.me/${toWhatsAppDigits(settings.whatsappNumber)}`,
      icon: MessageCircle,
      tone: "sage",
    },
    {
      id: "facebook",
      label: "Facebook",
      handle: "/casaherbert",
      href: "https://facebook.com",
      icon: Facebook,
      tone: "cream",
    },
  ];

  return (
    <section className="section-padding relative overflow-hidden bg-gradient-to-b from-brand-cream via-brand-cream to-brand-sage/10">
      <ParallaxLeaf className="pointer-events-none absolute -right-6 top-10 hidden sm:block" size={64} speed="slow" />
      <ParallaxLeaf className="pointer-events-none absolute left-4 bottom-8 hidden md:block" size={44} tone="moss" />
      <div className="container-herbert relative">
        <SectionHeading
          eyebrow="Contato"
          title="Fale com a Casa Herbert"
          description="Estamos em Orlândia/SP, atendendo somente com hora marcada. Escolha o canal que preferir."
        />

        <div className="mt-14 grid items-center gap-14 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
          <MapMockup />

          <div className="flex flex-col gap-6">
            <VisitInfoCard
              address={settings.salonAddress}
              isOpen={isOpen}
              businessHours={businessHours}
              showCta={false}
              className="h-auto"
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <LinkButton
                href={`https://wa.me/${settings.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="primary"
                className="flex-1"
              >
                <MessageCircle size={18} /> {formatPhoneDisplay(settings.whatsappNumber)}
              </LinkButton>
              <LinkButton href="/agendar" variant="secondary" className="flex-1">
                Agendar avaliação
              </LinkButton>
            </div>
          </div>
        </div>

        <div className="mt-20 text-center">
          <p className="eyebrow mb-3">Nos siga</p>
          <h2 className="font-serif text-2xl text-brand-forest sm:text-3xl">Fale por onde preferir</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-brand-graphite/80">
            Toque em um celular para abrir o Instagram, o WhatsApp ou o Facebook da Casa Herbert.
          </p>
          <PhoneCarousel items={socialChannels} className="mt-12" />
        </div>
      </div>
    </section>
  );
}
