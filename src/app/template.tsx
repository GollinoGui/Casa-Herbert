"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

// Na primeira carga não há entrada: o HTML do servidor já chega visível e a foto do
// Hero é pintada sem esperar o JS (com `opacity: 0` no SSR, o LCP ficava preso à
// hidratação). A entrada só toca nas trocas de rota feitas pelo app.
let isFirstLoad = true;

/**
 * template.tsx remonta a cada navegação (diferente de layout.tsx), então dá pra
 * animar a entrada do conteúdo em toda troca de rota. Sem isso, navegar entre
 * páginas era um corte seco mesmo com cada seção internamente animada. Fica de
 * fora do painel admin — lá a prioridade é fluidez de navegação, não apresentação.
 */
export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const skipEntrance = isFirstLoad;

  useEffect(() => {
    isFirstLoad = false;
  }, []);

  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={skipEntrance ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
