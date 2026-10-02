import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Rolagem suave do site público (Lenis), avançada pelo ticker do GSAP em vez de
 * um requestAnimationFrame próprio: assim Lenis e ScrollTrigger rodam no mesmo
 * quadro e uma cena com `scrub` não fica um quadro atrás. O Lenis continua
 * movendo a janela de verdade, então `window.scrollY`, `position: sticky` e o
 * `useScroll` do framer-motion seguem funcionando sem adaptação.
 *
 * Cenas com ScrollTrigger devem usar `scrub: true` (não um número): o Lenis já
 * suaviza, e dois amortecimentos empilhados deixam tudo "arrastado".
 */

let current: Lenis | null = null;

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);

  // O ScrollTrigger lê a posição a cada quadro; o proxy entrega a que o Lenis já
  // tem em cache, sem forçar recálculo de layout. Fica no nível do módulo porque
  // os ScrollTriggers dos componentes podem ser criados antes do Lenis existir.
  ScrollTrigger.scrollerProxy(document.documentElement, {
    scrollTop(value) {
      if (arguments.length && value !== undefined) {
        if (current) current.scrollTo(value, { immediate: true, force: true });
        else window.scrollTo(0, value);
      }
      return current ? current.scroll : window.scrollY;
    },
    getBoundingClientRect() {
      return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
    },
  });
}

// Cenas importam o GSAP daqui, não de "gsap" direto: garante que o plugin e o
// proxy acima já estão registrados quando o ScrollTrigger delas for criado.
export { gsap, ScrollTrigger };

export function getLenis() {
  return current;
}

const WHEEL_LERP = 0.1;
const TRACKPAD_LERP = 0.2;
const TRACKPAD_MULTIPLIER = 0.6;
const TRACKPAD_STICKY_MS = 250;

/**
 * No touchpad o sistema já manda a rolagem com inércia, e o lerp do Lenis soma
 * uma segunda cauda — a página "voa". Não há API que diga a origem do evento,
 * então a detecção é heurística, e uma vez detectado o touchpad ele "gruda" por
 * alguns ms para um gesto não alternar entre os dois modos no meio.
 */
function createTrackpadDetector() {
  let lastTrackpadAt = -Infinity;
  return (event: WheelEvent) => {
    if (event.timeStamp - lastTrackpadAt < TRACKPAD_STICKY_MS) {
      lastTrackpadAt = event.timeStamp;
      return true;
    }
    // Firefox: a roda do mouse chega em linhas, o touchpad em pixels.
    if (event.deltaMode !== 0) return false;
    const dy = Math.abs(event.deltaY);
    const legacyDelta = (event as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY;
    const looksLikeTrackpad =
      (legacyDelta !== undefined && legacyDelta === -3 * event.deltaY) ||
      !Number.isInteger(event.deltaY) ||
      (dy > 0 && dy < 50);
    if (looksLikeTrackpad) lastTrackpadAt = event.timeStamp;
    return looksLikeTrackpad;
  };
}

/** Liga a rolagem suave e devolve a função que desliga. Sem efeito com "reduzir movimento". */
export function startSmoothScroll(): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  const isTrackpad = createTrackpadDetector();
  const lenis: Lenis = new Lenis({
    lerp: WHEEL_LERP,
    // Clicar num link no meio da inércia não deixa a rolagem "vazar" pra próxima página.
    stopInertiaOnNavigate: true,
    virtualScroll(data) {
      if (data.event.type !== "wheel") return true;
      const wheel = data.event as WheelEvent;
      if (isTrackpad(wheel)) {
        lenis.options.lerp = TRACKPAD_LERP;
        data.deltaX *= TRACKPAD_MULTIPLIER;
        data.deltaY *= TRACKPAD_MULTIPLIER;
      } else {
        lenis.options.lerp = WHEEL_LERP;
      }
      return true;
    },
  });
  current = lenis;

  lenis.on("scroll", ScrollTrigger.update);
  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  // Sem "pulo" de tempo depois de um quadro lento.
  gsap.ticker.lagSmoothing(0);

  return () => {
    gsap.ticker.remove(tick);
    gsap.ticker.lagSmoothing(500, 33);
    lenis.destroy();
    if (current === lenis) current = null;
  };
}
