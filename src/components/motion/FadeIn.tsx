"use client";

import { motion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { useIntroGate } from "@/components/motion/introGate";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "none";
  /**
   * "view": anima ao entrar na tela (JS). "load": anima desde a primeira pintura, em
   * CSS — para o topo da página, que senão ficaria vazio até a hidratação.
   */
  trigger?: "view" | "load";
}

const directionOffset: Record<NonNullable<FadeInProps["direction"]>, { x: number; y: number }> = {
  up: { x: 0, y: 24 },
  down: { x: 0, y: -24 },
  left: { x: 24, y: 0 },
  right: { x: -24, y: 0 },
  none: { x: 0, y: 0 },
};

export function FadeIn({ children, delay = 0, className, direction = "up", trigger = "view" }: FadeInProps) {
  const introReady = useIntroGate();
  const offset = directionOffset[direction];

  if (trigger === "load") {
    const style = {
      "--load-delay": `${delay}s`,
      "--load-x": `${offset.x}px`,
      "--load-y": `${offset.y}px`,
    } as CSSProperties;
    return (
      <div className={cn("load-in load-fade", className)} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      whileInView={introReady ? { opacity: 1, x: 0, y: 0 } : undefined}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.95, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
