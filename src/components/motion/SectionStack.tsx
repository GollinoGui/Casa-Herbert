"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger } from "@/lib/utils/smooth-scroll";

// smoothstep: a mudança fica no meio do trajeto, quando a seção já está bem visível
// (com ease-out, quase tudo acontecia com ela ainda colada no rodapé da tela).
const easeInOut = (t: number) => t * t * (3 - 2 * t);

function clear(section: HTMLElement) {
  section.style.transform = "";
  section.style.transformOrigin = "";
  section.style.borderRadius = "";
  section.style.boxShadow = "";
}

/**
 * "Folhas empilhadas": cada seção de primeiro nível do <main> (menos a primeira
 * da página) entra um pouco menor e com cantos arredondados e se abre até a
 * largura toda conforme sobe na tela. Montado uma vez no layout e refeito a cada
 * troca de rota, para não ter que embrulhar cada seção à mão.
 *
 * Os estilos vão direto no DOM (fora do React) e são removidos por completo quando
 * a seção termina de abrir: um `transform` que sobrasse, mesmo `scale(1)`, viraria
 * referência para qualquer `position: fixed`/`sticky` lá dentro.
 * Seções com `data-no-stack` ficam de fora (ex.: a cena presa do CTA final).
 */
export function SectionStack() {
  const pathname = usePathname();

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main section")).filter(
      (s) => !s.parentElement?.closest("section"),
    );
    const targets = sections.slice(1).filter((s) => !s.hasAttribute("data-no-stack"));

    const mm = gsap.matchMedia();
    mm.add(
      {
        desktop: "(min-width: 640px) and (prefers-reduced-motion: no-preference)",
        mobile: "(max-width: 639px) and (prefers-reduced-motion: no-preference)",
      },
      (context) => {
        const minScale = context.conditions?.desktop ? 0.88 : 0.94;
        const maxRadius = context.conditions?.desktop ? 56 : 28;

        const paint = (section: HTMLElement, progress: number) => {
          if (progress >= 1) {
            clear(section);
            return;
          }
          const e = easeInOut(progress);
          section.style.transformOrigin = "50% 0%";
          section.style.transform = `scale(${minScale + (1 - minScale) * e})`;
          section.style.borderRadius = `${maxRadius * (1 - e)}px`;
          // Sombra para cima: a seção parece uma folha passando por cima da anterior.
          section.style.boxShadow = `0 -24px 60px -20px rgba(46, 46, 46, ${0.18 * (1 - e)})`;
        };

        targets.forEach((section) => {
          ScrollTrigger.create({
            trigger: section,
            start: "top bottom",
            end: "top 20%",
            onUpdate: (self) => paint(section, self.progress),
            onRefresh: (self) => paint(section, self.progress),
          });
        });

        // Antes de qualquer remedição, as seções voltam ao tamanho real: medidas
        // tiradas com elas encolhidas fariam os gatilhos de dentro dispararem cedo.
        const clearAll = () => targets.forEach(clear);
        ScrollTrigger.addEventListener("refreshInit", clearAll);

        return () => {
          ScrollTrigger.removeEventListener("refreshInit", clearAll);
          clearAll();
        };
      },
    );

    // Daqui em diante os estilos vêm daqui; solta o estado inicial do globals.css.
    document.documentElement.dataset.stackReady = "";

    // As seções da página nova mudam a altura do documento: os gatilhos das outras
    // cenas (ScrollSlide, DominoCard…) precisam medir de novo.
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => {
      cancelAnimationFrame(frame);
      mm.revert();
    };
  }, [pathname]);

  return null;
}
