import { LinkButton } from "@/components/ui/Button";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { FadeIn } from "@/components/motion/FadeIn";

export function ProductsPreviewSection() {
  return (
    <section className="section-padding bg-brand-beige/40">
      <div className="container-herbert grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <FadeIn>
          <PlaceholderImage
            label="Linha de produtos profissionais"
            tone="cream"
            className="aspect-[4/3] w-full"
          />
        </FadeIn>
        <FadeIn direction="left">
          <p className="eyebrow mb-3">Produtos</p>
          <h2 className="font-serif text-3xl text-brand-forest sm:text-4xl">
            Produtos profissionais que sustentam o cuidado
          </h2>
          <p className="mt-5 max-w-lg text-brand-graphite/80">
            Utilizamos e recomendamos linhas profissionais de cuidado capilar, sempre alinhadas ao
            protocolo individual de cada cliente. A Casa Herbert não é uma loja — os produtos fazem
            parte do acompanhamento contínuo da sua saúde capilar.
          </p>
          <div className="mt-8">
            <LinkButton href="/produtos" variant="secondary">
              Conhecer os produtos
            </LinkButton>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
