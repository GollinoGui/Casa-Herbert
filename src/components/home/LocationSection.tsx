import { Clock, MapPin } from "lucide-react";
import type { Settings } from "@/types";
import { SectionHeading } from "@/components/ui/Card";
import { FadeIn } from "@/components/motion/FadeIn";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";
import { MarginThread } from "@/components/motion/MarginThread";
import { OpenStatusBadge } from "@/components/ui/OpenStatusBadge";

const HOURS = [
  { day: "Terça a sábado", hours: "09:00–11:00 e 14:00–19:00" },
  { day: "Domingo e segunda-feira", hours: "Fechado" },
];

export function LocationSection({ settings, isOpen }: { settings: Settings; isOpen: boolean }) {
  return (
    <section className="section-padding relative overflow-hidden bg-brand-beige/25">
      <ParallaxLeaf className="pointer-events-none absolute -left-2 top-4 hidden sm:block" size={40} tone="moss" />
      <ParallaxLeaf className="pointer-events-none absolute -right-3 bottom-6 hidden sm:block" size={46} variant="branch" tone="moss" speed="slow" />
      <MarginThread side="left" tone="sage" className="top-10 bottom-10" />
      <MarginThread side="right" tone="sage" className="top-10 bottom-10" />
      <div className="container-herbert relative">
        <FadeIn>
          <SectionHeading eyebrow="Onde estamos" title="Venha nos visitar em Orlândia" />
        </FadeIn>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <FadeIn direction="right">
            <div className="overflow-hidden rounded-2xl border border-brand-beige shadow-softer">
              <iframe
                src="https://www.google.com/maps?q=Avenida+Onze+668+Orlandia+SP&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Localização da Casa Herbert em Orlândia"
                className="h-[320px] w-full border-0 sm:h-[360px]"
              />
            </div>
          </FadeIn>

          <FadeIn direction="left" delay={0.1}>
            <div className="flex h-full flex-col justify-center gap-6 rounded-2xl border border-brand-beige bg-brand-cream p-8">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-moss/15 text-brand-moss">
                  <MapPin size={17} />
                </span>
                <p className="pt-1.5 text-sm text-brand-graphite/85">{settings.salonAddress}</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-moss/15 text-brand-moss">
                  <Clock size={17} />
                </span>
                <div className="w-full">
                  <OpenStatusBadge open={isOpen} className="mb-2" />
                  <table className="w-full text-sm text-brand-graphite/85">
                    <tbody>
                      {HOURS.map((h) => (
                        <tr key={h.day}>
                          <td className="py-1 pr-4 font-medium text-brand-forest">{h.day}</td>
                          <td className="py-1">{h.hours}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-xs text-brand-graphite/60">Atendimento somente com hora marcada.</p>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
