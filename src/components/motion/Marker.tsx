"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/utils/smooth-scroll";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Marca-texto: um traço de cor é pintado atrás do trecho, da esquerda para a
 * direita, conforme a pessoa rola. Num trecho que quebra linha, o traço percorre
 * as linhas em sequência (o fundo de um elemento inline é contínuo entre as linhas).
 * Sem JS ou com "reduzir movimento", o destaque já aparece inteiro (estado do CSS).
 */
export function Marker({ children, tone = "sage" }: { children: ReactNode; tone?: "sage" | "gold" }) {
  const ref = useRef<HTMLSpanElement>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        el,
        { backgroundSize: "0% 100%" },
        {
          backgroundSize: "100% 100%",
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 85%", end: "top 55%", scrub: true },
        },
      );
    });
    return () => mm.revert();
  }, []);

  return (
    <span ref={ref} className={tone === "gold" ? "marker marker-gold" : "marker"}>
      {children}
    </span>
  );
}
