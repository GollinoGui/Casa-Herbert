import type { Metadata } from "next";
import { getActiveServices } from "@/lib/data/services";
import { getSettings } from "@/lib/data/settings";
import { BookingWizard } from "@/components/booking/BookingWizard";

export const metadata: Metadata = {
  title: "Agendar avaliação",
  description:
    "Agende sua avaliação individual na Casa Herbert em Orlândia/SP. Escolha o serviço, a data e o horário — a confirmação é feita pelo WhatsApp.",
};

interface AgendarPageProps {
  searchParams: { service?: string };
}

export default async function AgendarPage({ searchParams }: AgendarPageProps) {
  const [services, settings] = await Promise.all([getActiveServices(), getSettings()]);

  return (
    <section className="section-padding bg-brand-cream">
      <div className="container-herbert max-w-2xl">
        <div className="mb-10 text-center">
          <p className="eyebrow mb-3">Agendamento</p>
          <h1 className="font-serif text-3xl text-brand-forest sm:text-4xl">Agendar avaliação</h1>
          <p className="mt-4 text-brand-graphite/75">
            Escolha o serviço, a data e o horário. Sua solicitação será confirmada pela Casa Herbert
            através do WhatsApp.
          </p>
        </div>

        <BookingWizard
          services={services}
          minAdvanceDays={settings.minAdvanceDays}
          preselectedServiceId={searchParams.service}
        />
      </div>
    </section>
  );
}
