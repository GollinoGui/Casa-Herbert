"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import { useInView } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { cn } from "@/lib/utils/cn";

export interface CoverflowCarouselItem {
  id: string;
  tag?: string;
  titleLine1: string;
  titleLine2?: string;
  desc?: string;
  ctaText?: string;
  ctaUrl?: string;
  /** Quando presente, o CTA vira um botão que dispara isso em vez de navegar para ctaUrl. */
  onCtaClick?: () => void;
  placeholderTone?: "sage" | "cream" | "gold";
  /** URL de uma foto real (a escolhida para o serviço no painel). Sem isso, usa PlaceholderImage. */
  imageSrc?: string;
  /** object-position da foto real, útil quando a foto já tem marca/texto embutido a recortar. */
  imagePosition?: string;
}

interface SlotStyle {
  x: number;
  y: number;
  scale: number;
  rotateY: number;
  rotateZ: number;
  opacity: number;
  zIndex: number;
  brightness: number;
}

// Todas as poses usam a mesma lista de funções de transform, na mesma ordem — só
// assim a transição CSS interpola cada valor em vez de cair numa matriz e "torcer".
function toTransform(s: SlotStyle) {
  return `translateX(${s.x}px) translateY(${s.y}px) scale(${s.scale}) rotateY(${s.rotateY}deg) rotateZ(${s.rotateZ}deg)`;
}

const HIDDEN_SLOT: SlotStyle = { x: 0, y: 0, scale: 0.4, rotateY: 0, rotateZ: 0, opacity: 0, zIndex: 0, brightness: 0.5 };

function slotFor(offset: number, total: number): SlotStyle {
  if (offset === 0) return { x: 0, y: 0, scale: 1, rotateY: 0, rotateZ: 0, opacity: 1, zIndex: 30, brightness: 1 };
  if (offset === 1) return { x: 260, y: 0, scale: 0.84, rotateY: -24, rotateZ: 0, opacity: 0.65, zIndex: 20, brightness: 0.85 };
  if (offset === 2) return { x: 460, y: 0, scale: 0.68, rotateY: -38, rotateZ: 0, opacity: 0.38, zIndex: 10, brightness: 0.7 };
  if (offset === total - 1) return { x: -260, y: 0, scale: 0.84, rotateY: 24, rotateZ: 0, opacity: 0.65, zIndex: 20, brightness: 0.85 };
  if (offset === total - 2) return { x: -460, y: 0, scale: 0.68, rotateY: 38, rotateZ: 0, opacity: 0.38, zIndex: 10, brightness: 0.7 };
  return HIDDEN_SLOT;
}

/** Ordem em que os cards são "distribuídos" na entrada: centro, depois direita/esquerda alternando para fora. */
function dealOrder(offset: number, total: number) {
  if (offset === 0) return 0;
  const distance = Math.min(offset, total - offset);
  return distance * 2 - (offset <= total / 2 ? 1 : 0);
}

const DEAL_STAGGER_MS = 170;
const DEAL_DURATION_MS = 900;
// Leve "quique" ao assentar — só durante a distribuição; depois volta a curva normal do carrossel.
const DEAL_EASE = "cubic-bezier(0.34, 1.35, 0.64, 1)";

/** Pose antes de entrar: o centro espera embaixo, inclinado; os demais escondidos atrás dele. */
function predealSlot(slot: SlotStyle, offset: number): SlotStyle {
  if (offset === 0) return { ...slot, y: 160, scale: 0.86, rotateZ: -6, opacity: 0 };
  return { ...slot, x: 0, scale: 0.7, rotateY: 0, opacity: 0 };
}

type DealPhase = "waiting" | "dealing" | "done";

interface CoverflowCarouselProps {
  items: CoverflowCarouselItem[];
  autoplay?: boolean;
  autoplayDelay?: number;
  className?: string;
}

/**
 * Carrossel 3D "coverflow". Cada item usa PlaceholderImage por padrão (ver
 * CLAUDE.md > Fotos); passar `imageSrc` troca pela foto real do serviço.
 */
export function CoverflowCarousel({ items, autoplay = true, autoplayDelay = 6000, className }: CoverflowCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const total = items.length;
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { once: true, margin: "0px 0px -25% 0px" });
  const [phase, setPhase] = useState<DealPhase>("waiting");
  const visibleSlots = Math.min(total, 5);

  useEffect(() => {
    if (!inView || phase !== "waiting") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("done");
      return;
    }
    // Um quadro na pose inicial antes de trocar: sem isso o navegador nem pinta o
    // "antes" e os cards aparecem direto no lugar, sem transição.
    const frame = requestAnimationFrame(() => setPhase("dealing"));
    return () => cancelAnimationFrame(frame);
  }, [inView, phase]);

  useEffect(() => {
    if (phase !== "dealing") return;
    const timer = setTimeout(() => setPhase("done"), (visibleSlots - 1) * DEAL_STAGGER_MS + DEAL_DURATION_MS);
    return () => clearTimeout(timer);
  }, [phase, visibleSlots]);

  const nextSlide = useCallback(() => {
    setPhase("done");
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setPhase("done");
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToSlide = (idx: number) => {
    setPhase("done");
    setCurrentIndex(idx % total);
  };

  useEffect(() => {
    if (!autoplay || isPaused || isHovered || total <= 1 || phase !== "done") return;
    const interval = setInterval(nextSlide, autoplayDelay);
    return () => clearInterval(interval);
  }, [autoplay, autoplayDelay, isPaused, isHovered, nextSlide, total, phase]);

  // Ativo só enquanto o mouse está sobre o carrossel — evita sequestrar as
  // setas do teclado do resto da página (ex: usuário digitando um campo mais
  // abaixo). Quem navega só por teclado/toque já tem os botões prev/next/dots.
  useEffect(() => {
    if (!isHovered || total <= 1) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHovered, nextSlide, prevSlide, total]);

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 45) {
      if (diff < 0) nextSlide();
      else prevSlide();
    }
  };

  if (total === 0) return null;

  return (
    <div
      ref={rootRef}
      className={cn("relative w-full", className)}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Nossos cuidados"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <span className="sr-only" aria-live="polite">
        {items[currentIndex]?.titleLine1}
      </span>

      <div
        className="relative flex h-[480px] items-center justify-center overflow-hidden px-3 sm:px-8"
        style={{ perspective: "1400px" }}
      >
        {items.map((item, idx) => {
          const offset = (idx - currentIndex + total) % total;
          const isCenter = offset === 0;
          const slot = slotFor(offset, total);
          const pose = phase === "waiting" ? predealSlot(slot, offset) : slot;
          const dealing = phase === "dealing";
          // Espelha o scale() do transform: o card tem sempre 290px de layout, mas o
          // tamanho exibido de fato varia com o scale — usado pra pedir do next/image
          // só os pixels realmente visíveis (ver achado do Lighthouse sobre isso).
          const visualScale = slot.scale;

          const imageSizes = `${Math.round(290 * visualScale)}px`;

          return (
            <div
              key={item.id}
              role={isCenter ? undefined : "button"}
              tabIndex={isCenter ? undefined : 0}
              aria-label={isCenter ? undefined : `Ir para ${item.titleLine1}`}
              onClick={() => !isCenter && goToSlide(idx)}
              onKeyDown={(e) => {
                if (isCenter) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goToSlide(idx);
                }
              }}
              className={cn(
                "absolute flex h-[420px] w-[290px] flex-col overflow-hidden rounded-2xl border border-brand-beige bg-white transition-all duration-[800ms] ease-[cubic-bezier(0.25,1,0.5,1)]",
                isCenter
                  ? "shadow-soft ring-2 ring-brand-forest/30"
                  : "cursor-pointer shadow-softer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest/50"
              )}
              style={{
                transform: toTransform(pose),
                opacity: pose.opacity,
                zIndex: pose.zIndex,
                filter: `brightness(${pose.brightness})`,
                transformOrigin: "center center",
                ...(dealing && {
                  transitionDelay: `${dealOrder(offset, total) * DEAL_STAGGER_MS}ms`,
                  transitionDuration: `${DEAL_DURATION_MS}ms`,
                  transitionTimingFunction: DEAL_EASE,
                }),
              }}
            >
              <div className="relative h-[210px] w-full shrink-0">
                {item.imageSrc ? (
                  <Image
                    src={item.imageSrc}
                    alt={item.titleLine1}
                    fill
                    sizes={imageSizes}
                    className="object-cover"
                    style={{ objectPosition: item.imagePosition ?? "center" }}
                  />
                ) : (
                  <PlaceholderImage
                    label={item.titleLine1}
                    tone={item.placeholderTone ?? "sage"}
                    className="h-full w-full rounded-none"
                  />
                )}

                {item.tag ? (
                  <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-brand-moss shadow-softer">
                    {item.tag}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col items-center justify-center gap-1 px-5 py-3 text-center">
                <h3 className="font-serif text-lg text-brand-forest">{item.titleLine1}</h3>
                <div
                  className={cn(
                    "flex flex-col items-center gap-1.5 transition-opacity duration-500",
                    isCenter ? "opacity-100" : "pointer-events-none opacity-0"
                  )}
                >
                  {item.titleLine2 ? (
                    <p className="text-sm font-medium text-brand-graphite/70">{item.titleLine2}</p>
                  ) : null}
                  <span className="gold-divider my-1" />
                  {item.desc ? (
                    <p className="line-clamp-2 max-w-[230px] text-xs italic text-brand-graphite/75">{item.desc}</p>
                  ) : null}
                  {item.ctaText && item.onCtaClick ? (
                    <button
                      type="button"
                      onClick={item.onCtaClick}
                      className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-brand-forest px-5 py-2 text-xs font-semibold text-white shadow-soft transition-transform duration-200 hover:scale-105"
                    >
                      {item.ctaText}
                      <ArrowRight size={13} />
                    </button>
                  ) : item.ctaText && item.ctaUrl ? (
                    <Link
                      href={item.ctaUrl}
                      className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-brand-forest px-5 py-2 text-xs font-semibold text-white shadow-soft transition-transform duration-200 hover:scale-105"
                    >
                      {item.ctaText}
                      <ArrowRight size={13} />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}

        {total > 1 ? (
          <div className={cn("transition-opacity duration-700", phase === "done" ? "opacity-100" : "opacity-0")}>
            <button
              onClick={prevSlide}
              aria-label="Cuidado anterior"
              className="absolute left-0 top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-brand-beige bg-white/90 text-brand-forest shadow-soft transition-colors duration-200 hover:bg-brand-forest hover:text-white"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={nextSlide}
              aria-label="Próximo cuidado"
              className="absolute right-0 top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-brand-beige bg-white/90 text-brand-forest shadow-soft transition-colors duration-200 hover:bg-brand-forest hover:text-white"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        ) : null}
      </div>

      {total > 1 ? (
        <div
          className={cn(
            "mt-8 flex items-center justify-center gap-2 transition-opacity duration-700",
            phase === "done" ? "opacity-100" : "opacity-0"
          )}
        >
          {autoplay ? (
            <button
              type="button"
              onClick={() => setIsPaused((v) => !v)}
              aria-label={isPaused ? "Retomar troca automática" : "Pausar troca automática"}
              aria-pressed={isPaused}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-brand-graphite/50 transition hover:bg-brand-beige hover:text-brand-forest"
            >
              {isPaused ? <Play size={13} /> : <Pause size={13} />}
            </button>
          ) : null}
          <div className="flex items-center">
            {items.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => goToSlide(idx)}
                aria-label={`Ir para ${item.titleLine1}`}
                aria-current={idx === currentIndex ? "true" : undefined}
                className="flex h-8 items-center px-1"
              >
                <span
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    idx === currentIndex ? "w-7 bg-brand-forest" : "w-2 bg-brand-beige"
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
