"use client";

import { motion, useInView } from "framer-motion";
import { useRef, type CSSProperties } from "react";
import { useIntroGate } from "@/components/motion/introGate";

type HeadingTag = "h1" | "h2" | "h3" | "p" | "span";

interface WordsRiseProps {
  text: string;
  as?: HeadingTag;
  className?: string;
  delay?: number;
  /** "load": sobe desde a primeira pintura, em CSS (títulos do topo da página). Ver FadeIn. */
  trigger?: "view" | "load";
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Título em que cada palavra sobe de dentro de uma máscara, uma depois da outra.
 * As palavras continuam separadas por espaços reais, então o título segue lido
 * normalmente por leitor de tela e buscadores.
 */
export function WordsRise({ text, as: Tag = "h2", className, delay = 0, trigger = "view" }: WordsRiseProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const introReady = useIntroGate();
  const words = text.split(" ");

  return (
    <Tag ref={ref as never} className={className}>
      {words.map((word, i) => (
        <span key={i}>
          {/* O padding de baixo deixa caber a perna do "g"/"p" dentro da máscara; a margem negativa devolve o espaço. */}
          <span className="-mb-[0.15em] inline-block overflow-hidden pb-[0.15em] align-bottom">
            {trigger === "load" ? (
              <span
                className="load-in load-rise inline-block"
                style={{ "--load-delay": `${delay + i * 0.07}s` } as CSSProperties}
              >
                {word}
              </span>
            ) : (
              <motion.span
                className="inline-block"
                initial={{ y: "110%" }}
                animate={inView && introReady ? { y: "0%" } : undefined}
                transition={{ duration: 0.85, delay: delay + i * 0.07, ease: EASE }}
              >
                {word}
              </motion.span>
            )}
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </Tag>
  );
}
