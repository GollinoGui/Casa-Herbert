"use client";

import { motion } from "framer-motion";
import { useIntroGate } from "@/components/motion/introGate";

interface GrowLineProps {
  className?: string;
  /** "vertical" (padrão) cresce de cima para baixo; "horizontal" cresce da esquerda pra direita. */
  direction?: "vertical" | "horizontal";
}

/** Linha que cresce conforme entra na viewport — para timelines onde o traço deve
 * parecer "se desenhando" enquanto a pessoa rola. */
export function GrowLine({ className, direction = "vertical" }: GrowLineProps) {
  const introReady = useIntroGate();
  const horizontal = direction === "horizontal";
  const target = horizontal ? { scaleX: 1 } : { scaleY: 1 };
  return (
    <motion.div
      className={className}
      style={{ transformOrigin: horizontal ? "left" : "top" }}
      initial={horizontal ? { scaleX: 0 } : { scaleY: 0 }}
      whileInView={introReady ? target : undefined}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden="true"
    />
  );
}
