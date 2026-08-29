"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { ScissorCombIcon } from "@/components/icons/ScissorCombIcon";
import { ParallaxLeaf } from "@/components/motion/ParallaxLeaf";
import { IntroGateProvider } from "@/components/motion/introGate";

const EASE = [0.22, 1, 0.36, 1] as const;

// Marcas em volta do círculo do badge, como um selo — 8 traços a 45° de distância,
// da borda do círculo (raio 56) até um pouco além (raio 70), centrados em (72,72).
const BADGE_TICKS = [
  { x1: 134, y1: 72, x2: 142, y2: 72 },
  { x1: 116, y1: 116, x2: 122, y2: 122 },
  { x1: 72, y1: 134, x2: 72, y2: 142 },
  { x1: 28, y1: 116, x2: 22, y2: 122 },
  { x1: 10, y1: 72, x2: 2, y2: 72 },
  { x1: 28, y1: 28, x2: 22, y2: 22 },
  { x1: 72, y1: 10, x2: 72, y2: 2 },
  { x1: 116, y1: 28, x2: 122, y2: 22 },
];

/**
 * Cortina de entrada da home: um traço entra pela esquerda no terço superior da tela,
 * desenha uma tesoura no centro e sai pela direita, enquanto no centro da tela desenha
 * o selo do logo (círculo, marcas ao redor e monograma "CH"), a tesoura, o nome da
 * marca e o subtítulo — com folhas discretas nos cantos. Toca a cada carregamento da
 * página. Renderiza vazio no SSR e na primeira pintura do cliente de propósito — só
 * decide se anima depois de montado, pra nunca disputar com o conteúdo real da Hero
 * nem gerar mismatch de hidratação.
 *
 * Também expõe `IntroGateContext` (via `useIntroGate`) pro resto da home: enquanto a
 * cortina está tocando, o restante da página já está montado por trás dela — sem esse
 * gate, os `whileInView` do Hero disparariam escondidos e apareceriam "prontos" assim
 * que a cortina sai, em vez de animar depois dela.
 */
export function IntroReveal({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setReady(true);
      return;
    }
    setVisible(true);
  }, []);

  // Efeito separado do de cima de propósito: em dev, o Strict Mode roda o efeito
  // acima duas vezes (mount → cleanup → mount). Como o timer só depende de
  // `visible`, o replay do Strict Mode sempre limpa e recria o timeout corretamente
  // em vez de deixar dois timers concorrendo.
  useEffect(() => {
    if (!visible) return;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => {
      setVisible(false);
      setReady(true);
    }, 2500);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [visible]);

  return (
    <IntroGateProvider value={ready}>
      <AnimatePresence>
        {visible && (
        <motion.div
          aria-hidden="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-cream"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="pointer-events-none absolute left-8 top-8 hidden sm:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <ParallaxLeaf size={40} variant="leaf" tone="moss" />
          </motion.div>
          <motion.div
            className="pointer-events-none absolute bottom-8 right-8 hidden sm:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            <ParallaxLeaf size={34} variant="branch" tone="sage" />
          </motion.div>

          {/* Traço que entra pela esquerda, desenha uma tesoura no centro e sai pela direita. */}
          <div className="pointer-events-none absolute inset-x-0 top-[15%] h-10 -translate-y-1/2">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 40" preserveAspectRatio="none" fill="none">
              <motion.line
                x1="0"
                y1="20"
                x2="680"
                y2="20"
                stroke="#CBB89A"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.85 }}
                transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
              />
              <motion.line
                x1="920"
                y1="20"
                x2="1600"
                y2="20"
                stroke="#CBB89A"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.85 }}
                transition={{ duration: 0.6, delay: 1.3, ease: EASE }}
              />
            </svg>
            <svg
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              width="36"
              height="45"
              viewBox="0 0 48 60"
              fill="none"
            >
              <motion.path
                d="M8 4 L24 22 L40 50"
                stroke="#CBB89A"
                strokeWidth="2.4"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.85 }}
                transition={{ duration: 0.3, delay: 0.65, ease: EASE }}
              />
              <motion.path
                d="M40 4 L24 22 L8 50"
                stroke="#CBB89A"
                strokeWidth="2.4"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.85 }}
                transition={{ duration: 0.3, delay: 0.73, ease: EASE }}
              />
              <motion.circle
                cx="40"
                cy="50"
                r="8"
                stroke="#CBB89A"
                strokeWidth="2.4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.85 }}
                transition={{ duration: 0.25, delay: 0.95, ease: EASE }}
              />
              <motion.circle
                cx="8"
                cy="50"
                r="8"
                stroke="#CBB89A"
                strokeWidth="2.4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.85 }}
                transition={{ duration: 0.25, delay: 1, ease: EASE }}
              />
            </svg>
          </div>

          <div className="flex flex-col items-center gap-5">
            <svg width="144" height="144" viewBox="0 0 144 144" fill="none">
              {BADGE_TICKS.map((tick, index) => (
                <motion.line
                  key={index}
                  x1={tick.x1}
                  y1={tick.y1}
                  x2={tick.x2}
                  y2={tick.y2}
                  stroke="#CBB89A"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.7 }}
                  transition={{ duration: 0.3, delay: 0.15 + index * 0.04, ease: EASE }}
                />
              ))}
              <motion.circle
                cx="72"
                cy="72"
                r="56"
                stroke="#EF8523"
                strokeWidth="3"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, ease: EASE }}
              />
              <motion.text
                x="59"
                y="89"
                textAnchor="middle"
                className="font-serif"
                fontSize="45"
                fontWeight="600"
                fill="#53735A"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.45, ease: EASE }}
              >
                C
              </motion.text>
              <motion.text
                x="89"
                y="89"
                textAnchor="middle"
                className="font-serif"
                fontSize="45"
                fontWeight="600"
                fill="#BA681B"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.55, ease: EASE }}
              >
                H
              </motion.text>
            </svg>
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, delay: 0.9, ease: EASE }}
            >
              <ScissorCombIcon className="h-7 w-7 text-brand-moss" />
            </motion.div>
            <motion.p
              className="font-serif text-3xl italic text-brand-forest"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.15, duration: 0.55, ease: EASE }}
            >
              Casa Herbert
            </motion.p>
            <motion.p
              className="text-sm font-medium uppercase tracking-[0.25em] text-brand-moss"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.45, duration: 0.5, ease: EASE }}
            >
              Embelezamento &amp; Saúde Capilar
            </motion.p>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
      {children}
    </IntroGateProvider>
  );
}
