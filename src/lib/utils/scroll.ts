/**
 * Scroll suave para uso em navegação por âncora (clique em link do header,
 * troca de página com hash). O header é sticky e anima largura/altura ao
 * alternar entre o estado estático e o estado "pill" (ver Header.tsx); essa
 * mudança de layout no topo da página faz o navegador cancelar/travar um
 * `scrollIntoView`/`window.scrollTo` nativo com behavior: "smooth" no meio do
 * caminho (some pra no exato momento em que o header vira pill). Por isso o
 * scroll aqui é implementado manualmente via requestAnimationFrame, que não
 * depende do layout permanecer estável durante a animação. Com a rolagem suave
 * ligada, a animação é a do próprio Lenis: um rAF paralelo brigaria com ele.
 */

import { getLenis } from "@/lib/utils/smooth-scroll";

const DEFAULT_DURATION = 600;

/** Compensa a altura do header (sempre no estado "pill" depois de rolar) para a seção não ficar escondida atrás dele. */
const HEADER_SCROLL_OFFSET = 128;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function smoothScrollToY(targetY: number, duration = DEFAULT_DURATION) {
  const lenis = getLenis();
  if (lenis) {
    // O Lenis guarda a altura da página e limita o alvo a ela; logo depois de uma
    // troca de rota ela ainda é a da página anterior e a rolagem pararia antes.
    lenis.resize();
    lenis.scrollTo(Math.max(0, targetY), { duration: duration / 1000, easing: easeOutCubic });
    return;
  }

  const startY = window.scrollY;
  const clampedTarget = Math.max(0, targetY);
  const distance = clampedTarget - startY;

  if (Math.abs(distance) < 1) return;

  const startTime = performance.now();

  function step(now: number) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    window.scrollTo(0, startY + distance * easeOutCubic(t));
    if (t < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

export function smoothScrollToElementId(id: string, duration = DEFAULT_DURATION) {
  const el = document.getElementById(id);
  if (!el) return;

  const targetY = el.getBoundingClientRect().top + window.scrollY - HEADER_SCROLL_OFFSET;
  smoothScrollToY(targetY, duration);
}
