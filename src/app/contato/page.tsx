import type { Metadata } from "next";
import { Clock, Instagram, MapPin, MessageCircle } from "lucide-react";
import { getSettings } from "@/lib/data/settings";
import { SectionHeading } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { formatPhoneDisplay } from "@/lib/utils/phone";

export const metadata: Metadata = {
  title: "Contato",
  description:
    "Fale com a Casa Herbert em Orlândia/SP: endereço, horário de atendimento e WhatsApp para agendar sua avaliação de saúde capilar.",
};

const HOURS = [
  { day: "Terça a sábado", hours: "09:00–11:00 e 14:00–19:00" },
  { day: "Domingo e segunda-feira", hours: "Fechado" },
];

export default async function ContatoPage() {
  const settings = await getSettings();

  return (
    <section className="section-padding bg-brand-cream">
      <div className="container-herbert">
        <SectionHeading
          eyebrow="Contato"
          title="Fale com a Casa Herbert"
          description="Estamos em Orlândia/SP, atendendo somente com hora marcada. Escolha o canal que preferir."
        />

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-brand-beige shadow-softer">
            <iframe
              src="https://www.google.com/maps?q=Avenida+Onze+668+Orlandia+SP&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Localização da Casa Herbert em Orlândia"
              className="h-[320px] w-full border-0 sm:h-[420px]"
            />
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-brand-beige bg-white p-7">
              <div className="flex items-start gap-3">
                <MapPin size={20} className="mt-0.5 shrink-0 text-brand-moss" />
                <div>
                  <p className="text-sm font-medium text-brand-forest">Endereço</p>
                  <p className="mt-1 text-sm text-brand-graphite/80">{settings.salonAddress}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-brand-beige bg-white p-7">
              <div className="flex items-start gap-3">
                <Clock size={20} className="mt-0.5 shrink-0 text-brand-moss" />
                <div className="w-full">
                  <p className="text-sm font-medium text-brand-forest">Horário de atendimento</p>
                  <table className="mt-2 w-full text-sm text-brand-graphite/80">
                    <tbody>
                      {HOURS.map((h) => (
                        <tr key={h.day}>
                          <td className="py-1 pr-4">{h.day}</td>
                          <td className="py-1 text-right">{h.hours}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-brand-graphite/60">
                    Atendimento somente com hora marcada.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-brand-beige bg-white p-7">
              <div className="flex items-start gap-3">
                <Instagram size={20} className="mt-0.5 shrink-0 text-brand-moss" />
                <div>
                  <p className="text-sm font-medium text-brand-forest">Instagram</p>
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-sm text-brand-graphite/80 hover:text-brand-forest"
                  >
                    @casaherbert
                  </a>
                </div>
              </div>
            </div>

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
      </div>
    </section>
  );
}
