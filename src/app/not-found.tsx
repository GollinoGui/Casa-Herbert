import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/Button";
import { GoldDivider } from "@/components/motion/GoldDivider";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";
import { ScissorCombIcon } from "@/components/icons/ScissorCombIcon";

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className="section-padding relative overflow-hidden bg-gradient-to-b from-brand-cream via-brand-cream to-brand-sage/15 text-center">
      <ParallaxLeaf className="pointer-events-none absolute -left-4 top-10 hidden sm:block" size={70} speed="slow" />
      <ParallaxLeaf className="pointer-events-none absolute -right-2 bottom-6 hidden sm:block" size={54} variant="branch" tone="moss" />
      <div className="container-herbert relative max-w-xl">
        <ScissorCombIcon className="mx-auto h-10 w-10 text-brand-gold/70" aria-hidden="true" />
        <p className="eyebrow mt-6 mb-3 justify-center">Erro 404</p>
        <h1 className="font-serif text-4xl text-brand-forest sm:text-5xl">Página não encontrada</h1>
        <p className="mt-5 text-brand-graphite/80">
          O endereço que você tentou acessar não existe ou foi movido. Que tal voltar para o
          início ou agendar sua avaliação individual?
        </p>
        <GoldDivider className="mt-8" />
        <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <LinkButton href="/" variant="primary">
            Voltar para o início
          </LinkButton>
          <LinkButton href="/agendar" variant="secondary">
            Agendar avaliação
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
