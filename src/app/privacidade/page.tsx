import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como a Casa Herbert coleta, usa e protege os dados pessoais informados no site.",
  robots: { index: false, follow: true },
};

export default function PrivacidadePage() {
  return (
    <section className="section-padding bg-white">
      <div className="container-herbert max-w-3xl">
        <SectionHeading
          eyebrow="Privacidade"
          title="Política de Privacidade"
          description="Última atualização: agosto de 2026."
          align="left"
        />

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-brand-graphite/85">
          <div>
            <h2 className="font-serif text-lg text-brand-forest">1. Quais dados coletamos</h2>
            <p className="mt-2">
              Ao solicitar um agendamento pelo site, coletamos nome completo, número de WhatsApp e,
              opcionalmente, e-mail e uma observação escrita por você. Não coletamos dados de saúde
              sensíveis pelo formulário — informações sobre sua avaliação capilar são tratadas
              apenas presencialmente, durante o atendimento.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-lg text-brand-forest">2. Para que usamos esses dados</h2>
            <p className="mt-2">
              Usamos essas informações exclusivamente para confirmar, organizar e lembrar sua
              avaliação ou atendimento na Casa Herbert, entrando em contato pelo WhatsApp informado.
              Não usamos seus dados para envio de propaganda não solicitada nem os vendemos ou
              compartilhamos com terceiros para fins comerciais.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-lg text-brand-forest">3. Por quanto tempo guardamos</h2>
            <p className="mt-2">
              Mantemos os dados do seu agendamento pelo tempo necessário para o atendimento e para
              nosso histórico interno de clientes, podendo ser removidos mediante solicitação, salvo
              obrigação legal de retenção.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-lg text-brand-forest">4. Seus direitos</h2>
            <p className="mt-2">
              Conforme a Lei Geral de Proteção de Dados (LGPD), você pode solicitar a qualquer
              momento a confirmação, correção ou exclusão dos seus dados, entrando em contato
              diretamente pelo WhatsApp da Casa Herbert.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-lg text-brand-forest">5. Contato</h2>
            <p className="mt-2">
              Dúvidas sobre esta política podem ser enviadas pelo WhatsApp ou Instagram da Casa
              Herbert, disponíveis na página de{" "}
              <a href="/contato" className="text-brand-forest underline underline-offset-4">
                Contato
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
