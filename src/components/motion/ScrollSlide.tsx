"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/utils/smooth-scroll";
import { cn } from "@/lib/utils/cn";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type From = "left" | "right" | "up";

interface ScrollSlideProps {
  children: ReactNode;
  from?: From;
  className?: string;
  /** Classes do elemento que se move (ex.: o `flex` que organiza os filhos). */
  innerClassName?: string;
}

const DESKTOP_DISTANCE = 120;
const MOBILE_DISTANCE = 44;

/**
 * Entrada presa à rolagem: o elemento desliza do lado escolhido conforme a pessoa
 * rola, e volta se ela rolar para cima — diferente do FadeIn, que toca uma vez por
 * tempo. Com "reduzir movimento" não anima nada. Não usar no topo da página: o que
 * já está na tela ao carregar começaria parcialmente escondido.
 */
export function ScrollSlide({ children, from = "up", className, innerClassName }: ScrollSlideProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const trigger = triggerRef.current;
    const inner = innerRef.current;
    if (!trigger || !inner) return;

    const mm = gsap.matchMedia();
    mm.add(
      {
        desktop: "(min-width: 640px) and (prefers-reduced-motion: no-preference)",
        mobile: "(max-width: 639px) and (prefers-reduced-motion: no-preference)",
      },
      (context) => {
        const distance = context.conditions?.desktop ? DESKTOP_DISTANCE : MOBILE_DISTANCE;
        const x = from === "left" ? -distance : from === "right" ? distance : 0;
        const y = from === "up" ? distance * 0.6 : 0;
        gsap.fromTo(
          inner,
          { x, y, opacity: 0 },
          {
            x: 0,
            y: 0,
            opacity: 1,
            ease: "power2.out",
            // O wrapper de fora é o gatilho: ele não se move, então a medição não
            // depende do deslocamento que está sendo animado.
            scrollTrigger: { trigger, start: "top 95%", end: "top 60%", scrub: true },
          },
        );
      },
    );
    return () => mm.revert();
  }, [from]);

  return (
    <div ref={triggerRef} className={className}>
      <div ref={innerRef} className={cn("h-full will-change-transform", innerClassName)}>
        {children}
      </div>
    </div>
  );
}
