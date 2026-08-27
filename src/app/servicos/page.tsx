import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { getActiveServices } from "@/lib/data/services";
import { Card, SectionHeading } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { FadeIn } from "@/components/motion/FadeIn";
import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerChildren";
import { formatServiceDuration, formatServicePrice } from "@/lib/utils/service-format";

export const metadata: Metadata = {
  title: "Serviços",
  description:
    "Conheça os serviços de terapia capilar e saúde capilar da Casa Herbert em Orlândia/SP: avaliação, tricoscopia, fotobiomodulação e mais, sempre com protocolo individualizado.",
};

export default async function ServicosPage() {
  const services = await getActiveServices();

  return (
    <>
      <section className="section-padding bg-brand-cream">
        <div className="container-herbert">
          <FadeIn>
            <SectionHeading
              eyebrow="Nossos cuidados"
              title="Serviços Casa Herbert"
              description="Cada serviço abaixo é conduzido a partir de uma avaliação individual — nada aqui segue fórmula fixa. Escolha um cuidado e solicite seu agendamento."
            />
          </FadeIn>

          {services.length > 0 ? (
            <StaggerContainer className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <StaggerItem key={service.id}>
                  <Card className="flex h-full flex-col p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-soft">
                    <h3 className="font-serif text-xl text-brand-forest">{service.name}</h3>
                    <p className="mt-3 flex-1 text-sm text-brand-graphite/75">{service.description}</p>
                    <div className="mt-5 flex items-center justify-between border-t border-brand-beige pt-4 text-sm">
                      <span className="inline-flex items-center gap-1.5 text-brand-moss">
                        <Clock size={14} /> {formatServiceDuration(service.durationMinutes)}
                      </span>
                      <span className="font-medium text-brand-forest">
                        {formatServicePrice(service.priceCents)}
                      </span>
                    </div>
                    <LinkButton
                      href={`/agendar?service=${service.id}`}
                      variant="secondary"
                      className="mt-5 w-full"
                    >
                      Solicitar agendamento
                    </LinkButton>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          ) : (
            <p className="mt-14 text-center text-brand-graphite/70">
              Nenhum serviço disponível no momento. Entre em contato conosco pelo WhatsApp.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
