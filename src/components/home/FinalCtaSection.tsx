import { Facebook, Instagram, MessageCircle } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { PhoneFrame, type PhoneCarouselItem } from "@/components/ui/PhoneCarousel";
import { FadeIn } from "@/components/motion/FadeIn";
import { WordsRise } from "@/components/motion/WordsRise";
import { PhoneFanReveal } from "@/components/motion/PhoneFanReveal";
import { CircleTakeover } from "@/components/motion/CircleTakeover";
import { formatPhoneDisplay, toWhatsAppDigits } from "@/lib/utils/phone";

export function FinalCtaSection({ whatsappNumber }: { whatsappNumber: string }) {
  const instagramItem: PhoneCarouselItem = {
    id: "instagram",
    label: "Instagram",
    handle: "@casaherbert",
    href: "https://instagram.com",
    icon: Instagram,
    tone: "gold",
  };
  const whatsappItem: PhoneCarouselItem = {
    id: "whatsapp",
    label: "WhatsApp",
    handle: formatPhoneDisplay(whatsappNumber),
    href: `https://wa.me/${toWhatsAppDigits(whatsappNumber)}`,
    icon: MessageCircle,
    tone: "sage",
  };
  const facebookItem: PhoneCarouselItem = {
    id: "facebook",
    label: "Facebook",
    handle: "/casaherbert",
    href: "https://facebook.com",
    icon: Facebook,
    tone: "cream",
  };

  return (
    <CircleTakeover>
      <div className="text-center text-brand-cream">
        {/* Em telas baixas os celulares não cabem junto com o texto dentro da cena presa. */}
        <div className="container-herbert relative [@media(max-height:700px)]:hidden">
          <PhoneFanReveal
            items={[
              { href: instagramItem.href, label: instagramItem.label, frame: <PhoneFrame item={instagramItem} compact /> },
              { href: whatsappItem.href, label: whatsappItem.label, frame: <PhoneFrame item={whatsappItem} compact /> },
              { href: facebookItem.href, label: facebookItem.label, frame: <PhoneFrame item={facebookItem} compact /> },
            ]}
            className="mb-4"
          />
        </div>

        <div className="container-herbert relative mx-auto max-w-2xl">
          <WordsRise text="Vamos cuidar do seu couro cabeludo?" className="font-serif text-3xl sm:text-4xl" />
          <FadeIn delay={0.1}>
            <p className="mt-4 text-brand-cream/80">
              Agende sua avaliação individual e comece um cuidado pensado só para você.
            </p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <LinkButton href="/agendar" variant="gold">
                Agendar avaliação
              </LinkButton>
              <LinkButton
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="ghost"
                className="!text-brand-cream hover:!bg-white/10"
              >
                <MessageCircle size={18} /> Falar no WhatsApp
              </LinkButton>
            </div>
          </FadeIn>
        </div>
      </div>
    </CircleTakeover>
  );
}
