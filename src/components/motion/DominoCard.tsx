"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/utils/smooth-scroll";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Quanto cada coluna atrasa em relação à anterior, em px de rolagem.
const COLUMN_LAG_PX = 80;

/** Posição do card na sua linha da grade (0 = primeira coluna), lida do layout real. */
function columnIndex(el: HTMLElement) {
  const siblings = Array.from(el.parentElement?.children ?? []) as HTMLElement[];
  const index = siblings.indexOf(el);
  return siblings.slice(0, index).filter((s) => s.offsetTop === el.offsetTop).length;
}

/**
 * Card de grade que "se levanta": começa deitado para trás, apoiado na borda de
 * baixo, e fica de pé junto com a rolagem. Cada coluna começa um pouco depois da
 * anterior, então uma linha cai em cascata como dominó. A coluna é medida no
 * layout (não por índice), então funciona igual com 1, 2 ou 3 colunas.
 */
export function DominoCard({ children, className }: { children: ReactNode; className?: string }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const lying = { rotateX: 80, y: 40, opacity: 0, transformPerspective: 1100, transformOrigin: "50% 100%" };

      // Card já na tela ao abrir a página: presa à rolagem ele ficaria parado no meio
      // do caminho até a pessoa rolar. Esses fazem a cascata sozinhos, por tempo.
      // Posição absoluta (não a da tela): numa troca de rota isto roda antes de o
      // scroll voltar ao topo.
      const pageTop = outer.getBoundingClientRect().top + window.scrollY;
      if (pageTop < window.innerHeight * 0.9) {
        gsap.fromTo(inner, lying, {
          rotateX: 0,
          y: 0,
          opacity: 1,
          duration: 1.1,
          delay: 0.35 + columnIndex(outer) * 0.14,
          ease: "power3.out",
        });
        return;
      }

      const lag = () => columnIndex(outer) * COLUMN_LAG_PX;
      gsap.fromTo(
        inner,
        lying,
        {
          rotateX: 0,
          y: 0,
          opacity: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: outer,
            start: () => `top+=${lag()} 96%`,
            end: () => `top+=${lag()} 58%`,
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={outerRef} className={className}>
      <div ref={innerRef} className="h-full will-change-transform">
        {children}
      </div>
    </div>
  );
}
