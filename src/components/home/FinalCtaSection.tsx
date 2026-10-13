import { Facebook, Instagram, MessageCircle } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { PhoneFrame, type PhoneCarouselItem } from "@/components/ui/PhoneCarousel";
import { FadeIn } from "@/components/motion/FadeIn";
import { WordsRise } from "@/components/motion/WordsRise";
import { PhoneFanReveal } from "@/components/motion/PhoneFanReveal";
import { CircleTakeover } from "@/components/motion/CircleTakeover";
import type { Settings } from "@/types";
import { formatPhoneDisplay, toWhatsAppDigits } from "@/lib/utils/phone";
import { socialHandle } from "@/lib/utils/social";

export function FinalCtaSection({ settings }: { settings: Settings }) {
  const { whatsappNumber, instagramUrl, facebookUrl } = settings;
  const instagramItem: PhoneCarouselItem | null = instagramUrl
    ? { id: "instagram", label: "Instagram", handle: socialHandle(instagramUrl), href: instagramUrl, icon: Instagram, tone: "gold" }
    : null;
  const whatsappItem: PhoneCarouselItem = {
    id: "whatsapp",
    label: "WhatsApp",
    handle: formatPhoneDisplay(whatsappNumber),
    href: `https://wa.me/${toWhatsAppDigits(whatsappNumber)}`,
    icon: MessageCircle,
    tone: "sage",
  };
  const facebookItem: PhoneCarouselItem | null = facebookUrl
    ? { id: "facebook", label: "Facebook", handle: socialHandle(facebookUrl, "/"), href: facebookUrl, icon: Facebook, tone: "cream" }
    : null;
  const fanItem = (item: PhoneCarouselItem) => ({
    href: item.href,
    label: item.label,
    frame: <PhoneFrame item={item} compact />,
  });

  return (
    <CircleTakeover>
      <div className="text-center text-brand-cream">
        {/* Em telas baixas os celulares não cabem junto com o texto dentro da cena presa. */}
        <div className="container-herbert relative [@media(max-height:700px)]:hidden">
          <PhoneFanReveal
            left={instagramItem ? fanItem(instagramItem) : undefined}
            center={fanItem(whatsappItem)}
            right={facebookItem ? fanItem(facebookItem) : undefined}
            className="mb-4"
          />
        </div>

        <div className="container-herbert relative mx-auto max-w-2xl">
          <WordsRise text="Te espero aqui na Casa." className="font-serif text-3xl sm:text-4xl" />
          <FadeIn delay={0.1}>
            <p className="mt-4 text-brand-cream">
              Agende sua avaliação e venha conversar com calma sobre o seu couro cabeludo.
            </p>
            <p className="mt-3 font-hand text-3xl text-brand-cream">— Herbert</p>
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
