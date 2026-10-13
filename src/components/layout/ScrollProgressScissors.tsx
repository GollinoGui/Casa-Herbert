"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ScissorCombIcon } from "@/components/icons/ScissorCombIcon";

/**
 * Barra de progresso de leitura: uma tesoura "corta" a linha tracejada conforme o usuário rola a página.
 * Sem useSpring: o Lenis já suaviza a rolagem, e uma mola por cima deixava a tesoura atrasada.
 */
export function ScrollProgressScissors() {
  const { scrollYProgress: progress } = useScroll();
  const leftPercent = useTransform(progress, (v) => `${Math.min(Math.max(v, 0), 1) * 100}%`);

  return (
    <div className="relative h-6 w-full overflow-hidden">
      {/* trilha tracejada — ainda não percorrida */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-brand-beige" />
      {/* trecho já "cortado" */}
      <motion.div
        style={{ scaleX: progress, originX: 0 }}
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-brand-forest"
      />
      {/* tesoura acompanhando o progresso da leitura */}
      {/* translateX numa camada da largura da trilha (o % é da própria largura) em vez de
          animar `left`, que recalcularia o layout a cada quadro de rolagem. */}
      <motion.div style={{ x: leftPercent }} className="absolute inset-0">
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex h-6 w-6 animate-snip items-center justify-center rounded-full bg-brand-cream shadow-softer">
            <ScissorCombIcon className="h-[18px] w-[18px] rotate-[70deg] text-brand-forest" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
