import type { Metadata } from "next";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { getSettings } from "@/lib/data/settings";
import { getShowcaseProducts } from "@/lib/data/products";
import { Card, SectionHeading } from "@/components/ui/Card";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { LinkButton } from "@/components/ui/Button";
import { FadeIn } from "@/components/motion/FadeIn";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";
import { DominoCard } from "@/components/motion/DominoCard";

export const metadata: Metadata = {
  title: "Produtos",
  description:
    "Linhas profissionais de cuidado capilar recomendadas pela Casa Herbert em Orlândia/SP, sempre alinhadas ao protocolo individual de cada cliente.",
};

const placeholderTones = ["gold", "sage", "cream"] as const;

export default async function ProdutosPage() {
  // Quais produtos aparecem, com descrição e foto, é escolhido em /admin/estoque.
  const [settings, products] = await Promise.all([getSettings(), getShowcaseProducts()]);

  return (
    <>
      <section className="section-padding relative overflow-hidden bg-gradient-to-tr from-brand-beige/40 via-brand-cream to-brand-sage/10">
        <ParallaxLeaf className="pointer-events-none absolute right-6 top-8 hidden sm:block" size={44} tone="moss" />
        <div className="container-herbert relative">
          <FadeIn>
            <SectionHeading
              as="h1"
              eyebrow="Produtos"
              title="Linhas profissionais que sustentam o cuidado"
              description="A Casa Herbert não é uma loja — os produtos apresentados aqui fazem parte do acompanhamento contínuo da sua saúde capilar e são recomendados conforme sua avaliação individual."
            />
          </FadeIn>

          {products.length > 0 ? (
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, i) => (
                <DominoCard key={product.id}>
                  <Card className="group flex h-full flex-col overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-soft">
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          style={{ objectPosition: product.imagePosition ?? "center" }}
                        />
                      ) : (
                        <PlaceholderImage
                          tone={placeholderTones[i % placeholderTones.length]}
                          className="h-full w-full rounded-none"
                        />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <h2 className="font-serif text-lg text-brand-forest">{product.name}</h2>
                      {product.description ? (
                        <p className="mt-2 flex-1 text-sm text-brand-graphite/75">{product.description}</p>
                      ) : null}
                    </div>
                  </Card>
                </DominoCard>
              ))}
            </div>
          ) : (
            <p className="mx-auto mt-12 max-w-xl text-center text-brand-graphite/75">
              Cada indicação de produto nasce da sua avaliação. Pergunte para a gente quais linhas fazem
              sentido para o seu couro cabeludo.
            </p>
          )}
        </div>
      </section>

      <section className="section-padding relative overflow-hidden bg-white text-center">
        <ParallaxLeaf className="pointer-events-none absolute left-[8%] bottom-4 hidden sm:block" size={40} variant="leaf" />
        <div className="container-herbert relative max-w-xl">
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
