"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useIntroGate } from "@/components/motion/introGate";
import { GrowLine } from "@/components/motion/GrowLine";

const STEP_STAGGER = 0.7;
const LINE_DELAY_OFFSET = 0.35;
const LINE_DURATION = 0.5;

interface StepConnectorProps {
  /** Ícones já renderizados (ex.: `<Icon size={26} />`) — não referências de componente,
   * que não atravessam a fronteira Server → Client Component. */
  icons: ReactNode[];
  className?: string;
}

/** Fileira de círculos ligados por traços que "dispara" em cadeia conforme entra na
 * viewport: cada ícone estala e acende o traço até o próximo, como um dominó. */
export function StepConnector({ icons, className }: StepConnectorProps) {
  const introReady = useIntroGate();

  return (
    <div className={className}>
      {icons.map((icon, index) => (
        <div key={index} className="flex items-center">
          <motion.div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-moss/15 text-brand-moss ring-1 ring-brand-moss/25"
            initial={{ opacity: 0, scale: 0.3 }}
            whileInView={introReady ? { opacity: 1, scale: 1 } : undefined}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ type: "spring", stiffness: 280, damping: 18, delay: index * STEP_STAGGER }}
          >
            {icon}
          </motion.div>
          {index < icons.length - 1 && (
            <GrowLine
              direction="horizontal"
              delay={index * STEP_STAGGER + LINE_DELAY_OFFSET}
              duration={LINE_DURATION}
              className="mx-2 h-px w-10 bg-gradient-to-r from-brand-gold/70 to-brand-gold/15 sm:mx-4 sm:w-20"
            />
          )}
        </div>
      ))}
    </div>
  );
}
