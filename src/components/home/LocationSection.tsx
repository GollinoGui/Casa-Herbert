import { Clock, MapPin } from "lucide-react";
import type { Settings } from "@/types";
import { SectionHeading } from "@/components/ui/Card";
import { FadeIn } from "@/components/motion/FadeIn";

const HOURS = [
  { day: "Terça a sábado", hours: "09:00–11:00 e 14:00–19:00" },
  { day: "Domingo e segunda-feira", hours: "Fechado" },
];

export function LocationSection({ settings }: { settings: Settings }) {
  return (
    <section className="section-padding bg-white">
      <div className="container-herbert">
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
                <MapPin size={20} className="mt-0.5 shrink-0 text-brand-moss" />
                <p className="text-sm text-brand-graphite/85">{settings.salonAddress}</p>
              </div>
              <div className="flex items-start gap-3">
                <Clock size={20} className="mt-0.5 shrink-0 text-brand-moss" />
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
              <p className="text-xs text-brand-graphite/60">Atendimento somente com hora marcada.</p>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
