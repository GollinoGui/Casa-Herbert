"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Leaf, MapPin, Navigation } from "lucide-react";
import { useIntroGate } from "@/components/motion/introGate";
import { cn } from "@/lib/utils/cn";
import { DIRECTIONS_URL, MAP_EMBED_URL } from "@/components/location/map-links";

/**
 * O mapa dentro de um tablet deitado, que entra girando em 3D quando aparece na tela.
 * Ondas saem do centro do mapa — onde o embed do Google sempre crava o marcador.
 */
export function MapMockup({ className }: { className?: string }) {
  const introReady = useIntroGate();
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn("relative mx-auto w-full max-w-[620px] [perspective:1400px]", className)}>
      <motion.div
        initial={reduceMotion ? false : { rotateY: -22, rotateX: 10, y: 50, opacity: 0 }}
        whileInView={introReady ? { rotateY: 0, rotateX: 0, y: 0, opacity: 1 } : undefined}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ type: "spring", stiffness: 70, damping: 18, mass: 1 }}
        className="relative rounded-[1.9rem] bg-gradient-to-br from-neutral-600 via-brand-graphite to-neutral-900 p-2.5 shadow-soft sm:p-3"
      >
        <span className="absolute left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-neutral-700 ring-1 ring-neutral-500/40 sm:left-1.5" />

        <div className="overflow-hidden rounded-[1.3rem] bg-white">
          <div className="flex items-center gap-2 border-b border-brand-beige/70 px-3 py-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-brand-cream px-3 py-1.5">
              <MapPin size={14} className="shrink-0 text-brand-moss" />
              <span className="truncate text-xs text-brand-graphite/80">
                <span className="font-medium text-brand-forest">Casa Herbert</span> · Av. Onze, 668
              </span>
            </div>
            <a
              href={DIRECTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Traçar rota até a Casa Herbert"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-forest text-brand-cream transition-colors hover:bg-brand-moss"
            >
              <Navigation size={14} />
            </a>
          </div>

          <div className="relative">
            <iframe
              src={MAP_EMBED_URL}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Localização da Casa Herbert em Orlândia"
              className="block h-[280px] w-full border-0 sm:h-[340px]"
            />
            {!reduceMotion && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="absolute inset-0 rounded-full border-2 border-brand-gold"
                    initial={{ scale: 0.2, opacity: 0 }}
                    animate={{ scale: [0.2, 2.6], opacity: [0.7, 0] }}
                    transition={{ duration: 2.6, ease: "easeOut", repeat: Infinity, delay: 1 + i * 0.85 }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <motion.a
        href={DIRECTIONS_URL}
        target="_blank"
        rel="noopener noreferrer"
        initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.9 }}
        whileInView={introReady ? { opacity: 1, y: 0, scale: 1 } : undefined}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ delay: 0.7, type: "spring", stiffness: 200, damping: 18 }}
        className="group absolute -bottom-5 -left-2 flex items-center gap-3 rounded-2xl bg-white py-2.5 pl-2.5 pr-4 shadow-soft ring-1 ring-brand-beige sm:-left-6"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gold/15 text-brand-gold transition-transform group-hover:rotate-12">
          <Navigation size={16} />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-medium text-brand-forest">Como chegar</span>
          <span className="block text-[11px] text-brand-graphite/60">Abrir rota no Google Maps</span>
        </span>
      </motion.a>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: -12 }}
        whileInView={introReady ? { opacity: 1, y: 0 } : undefined}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ delay: 0.9, type: "spring", stiffness: 200, damping: 18 }}
        className="absolute -right-2 -top-4 hidden items-center gap-1.5 rounded-full bg-brand-moss px-3.5 py-1.5 text-xs font-medium text-brand-cream shadow-soft sm:flex sm:-right-5"
      >
        <Leaf size={12} />
        Orlândia · SP
      </motion.div>
    </div>
  );
}
