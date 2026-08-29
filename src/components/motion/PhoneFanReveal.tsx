"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { useIntroGate } from "@/components/motion/introGate";

const EASE = [0.22, 1, 0.36, 1] as const;

const centerVariants: Variants = {
  hidden: { opacity: 0, y: 70, scale: 0.85 },
  show: { opacity: 1, y: 0, scale: 1.05, transition: { duration: 0.85, ease: EASE } },
};

function sideVariants(dir: -1 | 1, delay: number): Variants {
  return {
    hidden: { opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.9 },
    show: {
      opacity: 1,
      // % é relativo à própria largura do celular (não do container), então a distância
      // acompanha o breakpoint (w-[110px] sm:w-[170px]) sem precisar de valores separados.
      x: `${dir * 118}%`,
      y: 14,
      rotate: dir * 6,
      scale: 1,
      transition: { duration: 0.75, ease: EASE, delay },
    },
  };
}

export interface PhoneFanRevealItem {
  href: string;
  label: string;
  /** JSX do celular (normalmente <PhoneFrame item={...} />) já renderizado pelo caller — ver nota abaixo. */
  frame: ReactNode;
}

interface PhoneFanRevealProps {
  items: [PhoneFanRevealItem, PhoneFanRevealItem, PhoneFanRevealItem];
  className?: string;
}

/**
 * Ao entrar na viewport, o celular central sobe até o lugar e só depois os dois
 * laterais abrem em leque de trás dele (ver pedido: "sobe... depois abre como um leque").
 * `viewport once: true` como no resto do site (FadeIn/StaggerChildren) — não replay ao rolar de novo.
 *
 * Recebe `frame` já renderizado (não o `PhoneCarouselItem` cru) porque este é um Client
 * Component: passar o `icon` (componente Lucide) como prop cruzando a fronteira servidor→cliente
 * quebra o RSC ("Functions cannot be passed directly to Client Components").
 */
export function PhoneFanReveal({ items, className }: PhoneFanRevealProps) {
  const introReady = useIntroGate();
  const [left, center, right] = items;

  return (
    <motion.div
      initial="hidden"
      whileInView={introReady ? "show" : undefined}
      viewport={{ once: true, margin: "-100px" }}
      className={className}
    >
      <div className="relative mx-auto h-[330px] w-full max-w-[380px] sm:h-[400px] sm:max-w-[580px]">
        <motion.a
          href={left.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir ${left.label}`}
          variants={sideVariants(-1, 0.65)}
          whileHover={{ scale: 1.05, rotate: 0, zIndex: 30, transition: { duration: 0.25 } }}
          className="group absolute inset-0 z-10 m-auto h-fit w-[110px] sm:w-[170px]"
        >
          {left.frame}
        </motion.a>

        <motion.a
          href={right.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir ${right.label}`}
          variants={sideVariants(1, 0.75)}
          whileHover={{ scale: 1.05, rotate: 0, zIndex: 30, transition: { duration: 0.25 } }}
          className="group absolute inset-0 z-10 m-auto h-fit w-[110px] sm:w-[170px]"
        >
          {right.frame}
        </motion.a>

        <motion.a
          href={center.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir ${center.label}`}
          variants={centerVariants}
          whileHover={{ scale: 1.15, transition: { duration: 0.25 } }}
          className="group absolute inset-0 z-20 m-auto h-fit w-[110px] sm:w-[170px]"
        >
          {center.frame}
        </motion.a>
      </div>
    </motion.div>
  );
}
