import { Leaf } from "lucide-react";
import type { Product } from "@/types";
import { LinkButton } from "@/components/ui/Button";
import { LaptopChatMockup } from "@/components/ui/LaptopChatMockup";
import { ScrollSlide } from "@/components/motion/ScrollSlide";
import { WordsRise } from "@/components/motion/WordsRise";
import { Marker } from "@/components/motion/Marker";

export function ProductsPreviewSection({ whatsappNumber, products }: { whatsappNumber: string; products: Product[] }) {
  return (
    <section className="wave-top-alt section-padding relative overflow-hidden bg-brand-cream bg-gradient-to-tr from-brand-beige/50 via-brand-beige/30 to-brand-sage/15">
      <div className="container-herbert relative grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <ScrollSlide from="left">
          <LaptopChatMockup
            whatsappNumber={whatsappNumber}
            // Só o que o chat mostra: preço e estoque não vão para o navegador.
            products={products.map(({ name, description, imageUrl, imagePosition }) => ({
              name,
              description,
              imageUrl,
              imagePosition,
            }))}
          />
        </ScrollSlide>
        <ScrollSlide from="right">
          <p className="eyebrow mb-3 inline-flex items-center gap-1.5">
            <Leaf size={12} className="text-brand-moss" aria-hidden="true" />
            Produtos
          </p>
          <WordsRise
            text="Produtos profissionais que sustentam o cuidado"
            delay={0.15}
            className="font-serif text-3xl text-brand-forest sm:text-4xl"
          />
          <p className="mt-5 max-w-lg text-brand-graphite/80">
            Utilizamos e recomendamos linhas profissionais de cuidado capilar, sempre alinhadas ao
            protocolo individual de cada cliente. <Marker>A Casa Herbert não é uma loja</Marker> — os produtos fazem
            parte do acompanhamento contínuo da sua saúde capilar.
          </p>
          <div className="mt-8">
            <LinkButton href="/produtos" variant="secondary">
              Conhecer os produtos
            </LinkButton>
          </div>
        </ScrollSlide>
      </div>
    </section>
  );
}
