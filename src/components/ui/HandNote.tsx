import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type ArrowDirection = "up-left" | "up-right" | "down-left" | "down-right";

interface HandNoteProps {
  children: ReactNode;
  /** Seta riscada à mão saindo da anotação na direção indicada. */
  arrow?: ArrowDirection;
  className?: string;
}

// Desenhada apontando para cima e para a esquerda; as outras direções são espelhos.
const ARROW_FLIP: Record<ArrowDirection, string> = {
  "up-left": "",
  "up-right": "-scale-x-100",
  "down-left": "-scale-y-100",
  "down-right": "-scale-100",
};

/**
 * Anotação à mão, como num caderno de acompanhamento. Texto real (lido por leitor
 * de tela), em verde-musgo: o tom da marca que passa no contraste sobre o creme.
 */
export function HandNote({ children, arrow, className }: HandNoteProps) {
  const arrowSvg = arrow ? (
    <svg
      viewBox="0 0 48 40"
      fill="none"
      aria-hidden="true"
      className={cn("h-8 w-10 shrink-0 text-brand-moss", ARROW_FLIP[arrow])}
    >
      <path d="M44 36C34 34 20 26 10 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 14 9 6l9 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : null;
  const pointsUp = arrow?.startsWith("up");

  return (
    <p
      className={cn(
        "flex items-center gap-1 font-hand text-xl font-medium leading-tight text-brand-moss sm:text-2xl",
        pointsUp ? "flex-col items-start" : "flex-col-reverse items-start",
        arrow?.endsWith("right") && "items-end text-right",
        className
      )}
    >
      {arrowSvg}
      <span>{children}</span>
    </p>
  );
}
