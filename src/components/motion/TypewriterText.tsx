"use client";

import { useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useIntroGate } from "@/components/motion/introGate";

interface TypewriterTextProps {
  text: string;
  className?: string;
  /** Segundos antes de começar a digitar, contados a partir de quando entra na tela. */
  delay?: number;
  /** Milissegundos por caractere. */
  speed?: number;
}

const PUNCTUATION_PAUSE = 7;
const CARET_LINGER_MS = 1600;

/**
 * Digita o texto quando ele entra na tela. O texto inteiro já está no layout desde
 * o início (o que falta digitar fica com `visibility: hidden`), então as linhas não
 * mudam de quebra nem empurram o resto da página enquanto as letras aparecem. Leitor
 * de tela recebe a frase completa pelo `sr-only`; a parte animada é aria-hidden.
 * Para frases curtas — num parágrafo longo a espera vira incômodo.
 */
export function TypewriterText({ text, className, delay = 0, speed = 42 }: TypewriterTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const introReady = useIntroGate();
  const [count, setCount] = useState(0);
  const [caretVisible, setCaretVisible] = useState(false);

  useEffect(() => {
    if (!inView || !introReady) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(text.length);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    let typed = 0;
    const step = () => {
      typed += 1;
      setCount(typed);
      if (typed >= text.length) {
        timer = setTimeout(() => setCaretVisible(false), CARET_LINGER_MS);
        return;
      }
      const pause = /[,.;:!?—]/.test(text[typed - 1]) ? speed * PUNCTUATION_PAUSE : speed;
      timer = setTimeout(step, pause);
    };
    timer = setTimeout(() => {
      setCaretVisible(true);
      step();
    }, delay * 1000);
    return () => clearTimeout(timer);
  }, [inView, introReady, text, delay, speed]);

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, count)}
        {/* Inline (não inline-block): um inline-block abriria um ponto de quebra de
            linha no meio da palavra e o texto pularia de linha enquanto é digitado. */}
        <span className="relative">
          <span
            className={`type-caret absolute bottom-[0.1em] left-[0.05em] h-[1.05em] w-[2px] bg-current transition-opacity duration-500 ${
              caretVisible ? "opacity-100" : "opacity-0"
            }`}
          />
        </span>
        <span className="invisible">{text.slice(count)}</span>
      </span>
    </span>
  );
}
