"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { smoothScrollToElementId } from "@/lib/utils/scroll";
import { getLenis } from "@/lib/utils/smooth-scroll";

/**
 * Garante o padrão de scroll do site: toda troca de página começa no topo. Se
 * a nova URL já trouxer uma âncora (#secao), rola suavemente até essa seção em
 * vez do topo — a navegação entre páginas via next/link usa pushState, então
 * o navegador não faz o scroll-to-hash nativo sozinho, é preciso disparar aqui.
 * O reset para o topo é instantâneo (não suave): é o que o usuário espera de
 * uma troca de página, e uma animação aqui só faz a transição parecer lenta.
 * Com a rolagem suave ligada o salto passa pelo Lenis — senão a posição interna
 * dele continua a da página anterior e a próxima rolada "pula" de volta.
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
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      else window.scrollTo(0, 0);
      return;
    }

    smoothScrollToElementId(hash);
  }, [pathname]);

  return null;
}
