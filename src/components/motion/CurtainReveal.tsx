"use client";

import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { gsap } from "@/lib/utils/smooth-scroll";
import { cn } from "@/lib/utils/cn";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Mesmo raio do rounded-2xl das fotos (SiteImage/PlaceholderImage), senão os cantos
// "pulam" de reto para arredondado no fim da revelação.
const HIDDEN = {
  up: "inset(100% 0% 0% 0% round 1rem)",
  right: "inset(0% 100% 0% 0% round 1rem)",
};
const SHOWN = "inset(0% 0% 0% 0% round 1rem)";
const START_ZOOM = 1.3;

interface CurtainRevealProps {
  children: ReactNode;
  className?: string;
  /**
   * "scroll": a cortina abre junto com a rolagem (fotos no meio da página).
   * "load": toca sozinha uma vez ao abrir a página (fotos do topo, já visíveis ao carregar).
   * É CSS (classes `load-*` do globals.css), para tocar sem esperar a hidratação.
   */
  mode?: "scroll" | "load";
  /** "up": a cortina sobe de baixo para cima. "right": corre da esquerda para a direita. */
  direction?: "up" | "right";
  delay?: number;
}

/**
 * A foto aparece por uma máscara que abre (de baixo para cima ou da esquerda para
 * a direita), enquanto a imagem dentro dela recua de um zoom até o tamanho normal.
 * Com "reduzir movimento", aparece direto.
 */
export function CurtainReveal({ children, className, mode = "scroll", direction = "up", delay = 0 }: CurtainRevealProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const hidden = HIDDEN[direction];

  useIsoLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || mode === "load") return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap
        .timeline({
          scrollTrigger: { trigger: outer, start: "top 90%", end: "top 35%", scrub: true },
        })
        .fromTo(outer, { clipPath: hidden }, { clipPath: SHOWN, ease: "power2.out" })
        .fromTo(inner, { scale: START_ZOOM }, { scale: 1, ease: "none" }, 0);
    });
    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(outer, { clipPath: "none" });
    });
    return () => mm.revert();
  }, [mode, hidden]);

  if (mode === "load") {
    const style = { "--load-delay": `${delay}s` } as CSSProperties;
    return (
      <div className={cn("load-in", `load-curtain-${direction}`, className)} style={style}>
        <div className="load-in load-zoom h-full" style={style}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div ref={outerRef} className={className}>
      <div ref={innerRef} className="h-full will-change-transform">
        {children}
      </div>
    </div>
  );
}
