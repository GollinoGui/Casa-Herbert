"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Garante o padrão de scroll do site: toda troca de página rola suavemente até
 * o início. Se a nova URL já trouxer uma âncora (#secao), rola até essa seção
 * em vez do topo — a navegação entre páginas via next/link usa pushState, então
 * o navegador não faz o scroll-to-hash nativo sozinho, é preciso disparar aqui.
 */
export function ScrollRestoration() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const hash = window.location.hash.slice(1);
    if (!hash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
  }, [pathname]);

  return null;
}
