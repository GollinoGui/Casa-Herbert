import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/PageHeader";
import { WaitlistManager } from "@/components/admin/WaitlistManager";
import { getWaitlistOpenings, listWaitlist } from "@/lib/data/waitlist";

export const metadata: Metadata = { title: "Lista de espera" };

export default async function ListaDeEsperaPage() {
  const [entries, openings] = await Promise.all([listWaitlist("waiting"), getWaitlistOpenings()]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Atendimento"
        title="Lista de espera"
        guideKey="lista-de-espera"
        guide={[
          <>Dia cheio? Anote quem queria aquele dia e o período (manhã ou tarde).</>,
          <>
            Quando abrir um horário que serve, o cartão fica destacado com <strong>Vaga às ...</strong> e o sino avisa.
          </>,
          <>
            <strong>Avisar</strong> abre o WhatsApp com a mensagem pronta. <strong>Agendar</strong> marca o horário e tira a cliente da
            lista.
          </>,
        ]}
      />
      <WaitlistManager entries={entries} openings={openings} />
    </div>
  );
}
