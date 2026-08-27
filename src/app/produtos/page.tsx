import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { getSettings } from "@/lib/data/settings";
import { Card, SectionHeading } from "@/components/ui/Card";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { LinkButton } from "@/components/ui/Button";
import { FadeIn } from "@/components/motion/FadeIn";
import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerChildren";

export const metadata: Metadata = {
  title: "Produtos",
  description:
    "Linhas profissionais de cuidado capilar recomendadas pela Casa Herbert em Orlândia/SP, sempre alinhadas ao protocolo individual de cada cliente.",
};

const PRODUCT_LINES = [
  {
    name: "Shampoo de Limpeza Suave",
    description: "Higienização delicada, pensada para preservar o equilíbrio do couro cabeludo.",
  },
  {
    name: "Tônico Fortalecedor",
    description: "Uso complementar ao protocolo, indicado para apoiar a saúde dos fios entre sessões.",
  },
  {
    name: "Sérum Pós-Terapia",
    description: "Finalização recomendada após sessões de terapia capilar e fotobiomodulação.",
  },
  {
    name: "Máscara de Nutrição",
    description: "Cuidado intensivo indicado conforme a necessidade identificada na avaliação.",
  },
  {
    name: "Condicionador de Manutenção",
    description: "Uso contínuo no dia a dia, alinhado ao protocolo definido para você.",
  },
  {
    name: "Óleo de Finalização",
    description: "Toque final para fios e comprimentos, recomendado conforme cada rotina.",
  },
];

export default async function ProdutosPage() {
  const settings = await getSettings();

  return (
    <>
      <section className="section-padding bg-brand-cream">
        <div className="container-herbert">
          <FadeIn>
            <SectionHeading
              eyebrow="Produtos"
              title="Linhas profissionais que sustentam o cuidado"
              description="A Casa Herbert não é uma loja — os produtos apresentados aqui fazem parte do acompanhamento contínuo da sua saúde capilar e são recomendados conforme sua avaliação individual."
            />
          </FadeIn>

          <StaggerContainer className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCT_LINES.map((product) => (
              <StaggerItem key={product.name}>
                <Card className="flex h-full flex-col overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-soft">
                  <PlaceholderImage label={product.name} tone="gold" className="aspect-[4/3] w-full rounded-none" />
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-serif text-lg text-brand-forest">{product.name}</h3>
                    <p className="mt-2 flex-1 text-sm text-brand-graphite/75">{product.description}</p>
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="section-padding bg-white text-center">
        <div className="container-herbert max-w-xl">
          <FadeIn>
            <h2 className="font-serif text-2xl text-brand-forest sm:text-3xl">
              Quer saber qual produto é indicado para você?
            </h2>
            <p className="mt-4 text-brand-graphite/75">
              As recomendações de produto fazem parte do seu protocolo individual. Fale com a gente
              pelo WhatsApp para tirar dúvidas.
            </p>
            <div className="mt-8">
              <LinkButton
                href={`https://wa.me/${settings.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="primary"
              >
                <MessageCircle size={18} /> Perguntar no WhatsApp
              </LinkButton>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
