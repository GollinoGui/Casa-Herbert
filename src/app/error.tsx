"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import { GoldDivider } from "@/components/motion/GoldDivider";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";
import { ScissorCombIcon } from "@/components/icons/ScissorCombIcon";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="section-padding relative overflow-hidden bg-gradient-to-b from-brand-cream via-brand-cream to-brand-sage/15 text-center">
      <ParallaxLeaf className="pointer-events-none absolute -left-4 top-10 hidden sm:block" size={70} speed="slow" />
      <ParallaxLeaf className="pointer-events-none absolute -right-2 bottom-6 hidden sm:block" size={54} variant="branch" tone="moss" />
      <div className="container-herbert relative max-w-xl">
        <ScissorCombIcon className="mx-auto h-10 w-10 text-brand-gold/70" aria-hidden="true" />
        <p className="eyebrow mt-6 mb-3 justify-center">Algo deu errado</p>
        <h1 className="font-serif text-4xl text-brand-forest sm:text-5xl">Não foi possível carregar esta página</h1>
        <p className="mt-5 text-brand-graphite/80">
          Ocorreu um erro inesperado. Você pode tentar novamente ou voltar para o início — se o
          problema continuar, fale com a gente pelo WhatsApp.
        </p>
        <GoldDivider className="mt-8" />
        <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button variant="primary" onClick={reset}>
            Tentar novamente
          </Button>
          <LinkButton href="/" variant="secondary">
            Voltar para o início
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
