import { MessageCircle } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { FadeIn } from "@/components/motion/FadeIn";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";

export function FinalCtaSection({ whatsappNumber }: { whatsappNumber: string }) {
  return (
    <section className="relative overflow-hidden bg-brand-forest py-20 text-center text-brand-cream sm:py-28">
      <div className="pointer-events-none absolute -bottom-16 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-brand-moss/25 blur-3xl" />
      <ParallaxLeaf className="pointer-events-none absolute -left-6 top-6 opacity-40" size={80} speed="slow" tone="moss" />
      <ParallaxLeaf className="pointer-events-none absolute -right-4 bottom-4 opacity-40" size={64} variant="branch" tone="moss" />
      <ParallaxLeaf className="pointer-events-none absolute right-[15%] top-10 hidden opacity-30 sm:block" size={38} variant="leaf" />

      <div className="container-herbert relative mx-auto max-w-2xl">
        <FadeIn>
          <h2 className="font-serif text-3xl sm:text-4xl">Pronta para cuidar do seu couro cabeludo?</h2>
        </FadeIn>
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
    </section>
  );
}
