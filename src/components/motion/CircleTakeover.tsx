"use client";

import { Leaf } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ScrollTrigger } from "@/lib/utils/smooth-scroll";

const SEED_SIZE = 96;

const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
/** smoothstep: 0 antes de `a`, 1 depois de `b`, curva suave entre os dois. */
const smooth = (a: number, b: number, n: number) => {
  const t = clamp((n - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * Cena presa à rolagem: a seção fica parada na tela enquanto um círculo verde nasce
 * no centro (uma "semente" com uma folha) e cresce até cobrir a tela toda; só então
 * o conteúdo aparece por cima.
 *
 * `sticky` nativo em vez de pin do ScrollTrigger: sem pin-spacer nem saltos. Os
 * estilos vão direto no DOM a cada quadro — nada de setState por quadro. O conteúdo
 * só é montado quando o círculo termina de cobrir a tela, e já visível: quem anima a
 * entrada são os próprios componentes de dentro, por tempo (celular do centro sobe,
 * os laterais abrem em leque de trás dele, título sobe). Se ele fosse montado antes
 * e esmaecido junto com a rolagem, essas entradas tocariam meio transparentes e,
 * quando o conteúdo ficasse nítido, o leque já estaria aberto.
 *
 * Com "reduzir movimento" não há cena: as classes `motion-reduce:` deixam a seção
 * com altura normal e fundo verde, e o conteúdo é montado de cara.
 */
export function CircleTakeover({ children, className }: { children: ReactNode; className?: string }) {
  const rootRef = useRef<HTMLElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const seedRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const circle = circleRef.current;
    const seed = seedRef.current;
    const content = contentRef.current;
    if (!root || !circle || !seed || !content) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      content.style.opacity = "1";
      setMounted(true);
      return;
    }

    // O círculo já tem o tamanho final (cobre a tela) e é *encolhido* até o tamanho
    // da semente. Ampliar um círculo pequeno deixaria a borda borrada: o navegador
    // rasteriza a camada no tamanho de layout e estica.
    let seedScale = 0.1;
    const layout = () => {
      seedScale = SEED_SIZE / circle.offsetWidth;
    };

    const COVERED_AT = 0.5;
    let revealed = false;
    const paint = (p: number) => {
      const grow = smooth(0.02, COVERED_AT, p);
      const seedFade = smooth(0.02, 0.18, p);
      // Só serve para esconder o conteúdo de novo se a pessoa rolar de volta e o
      // círculo voltar a encolher; na ida ele já aparece inteiro.
      const shown = revealed ? smooth(COVERED_AT - 0.08, COVERED_AT, p) : 0;

      circle.style.transform = `scale(${seedScale + (1 - seedScale) * grow})`;
      seed.style.opacity = String(1 - seedFade);
      seed.style.transform = `scale(${1 - 0.4 * seedFade})`;
      content.style.opacity = String(shown);
      content.style.pointerEvents = shown > 0.5 ? "auto" : "none";

      if (p >= COVERED_AT && !revealed) {
        revealed = true;
        content.style.opacity = "1";
        content.style.pointerEvents = "auto";
        setMounted(true);
      }
    };

    layout();
    const trigger = ScrollTrigger.create({
      trigger: root,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => paint(self.progress),
      onRefresh: (self) => {
        layout();
        paint(self.progress);
      },
    });
    paint(trigger.progress);

    return () => trigger.kill();
  }, []);

  return (
    <section
      ref={rootRef}
      data-no-stack
      className={`relative h-[210svh] bg-brand-cream sm:h-[240svh] motion-reduce:h-auto sm:motion-reduce:h-auto ${className ?? ""}`}
    >
      <div className="sticky top-0 flex h-svh items-center justify-center overflow-hidden motion-reduce:relative motion-reduce:h-auto motion-reduce:bg-brand-moss motion-reduce:py-20">
        {/* Margem negativa em vez de translate para centralizar: o transform é da animação.
            150vmax de diâmetro cobre até os cantos de qualquer proporção de tela. */}
        <div
          ref={circleRef}
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -ml-[75vmax] -mt-[75vmax] h-[150vmax] w-[150vmax] rounded-full bg-brand-moss will-change-transform motion-reduce:hidden"
        />
        <div
          ref={seedRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -ml-12 -mt-12 flex h-24 w-24 items-center justify-center motion-reduce:hidden"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-brand-moss/30" />
          <Leaf size={30} strokeWidth={1.5} className="relative text-brand-cream" />
        </div>
        <div ref={contentRef} className="relative z-10 w-full" style={{ opacity: 0 }}>
          {mounted ? children : null}
        </div>
      </div>
    </section>
  );
}
