"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
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
  /** Caminho de uma foto real (ex: "/images/servicos/x.jpg"). Sem isso, usa PlaceholderImage. */
  imageSrc?: string;
  /** object-position da foto real, útil quando a foto já tem marca/texto embutido a recortar. */
  imagePosition?: string;
}

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

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToSlide = (idx: number) => setCurrentIndex(idx % total);

  useEffect(() => {
    if (!autoplay || isPaused || isHovered || total <= 1) return;
    const interval = setInterval(nextSlide, autoplayDelay);
    return () => clearInterval(interval);
  }, [autoplay, autoplayDelay, isPaused, isHovered, nextSlide, total]);

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

          let transform = "translateX(0px) scale(0.4) rotateY(0deg)";
          let opacity = 0;
          let zIndex = 0;
          let filter = "brightness(0.5)";
          // Espelha o scale() do transform: o card tem sempre 290px de layout, mas o
          // tamanho exibido de fato varia com o scale — usado pra pedir do next/image
          // só os pixels realmente visíveis (ver achado do Lighthouse sobre isso).
          let visualScale = 0.4;
          const isCenter = offset === 0;

          if (offset === 0) {
            transform = "translateX(0px) scale(1) rotateY(0deg)";
            opacity = 1;
            zIndex = 30;
            filter = "brightness(1)";
            visualScale = 1;
          } else if (offset === 1) {
            transform = "translateX(260px) scale(0.84) rotateY(-24deg)";
            opacity = 0.65;
            zIndex = 20;
            filter = "brightness(0.85)";
            visualScale = 0.84;
          } else if (offset === 2) {
            transform = "translateX(460px) scale(0.68) rotateY(-38deg)";
            opacity = 0.38;
            zIndex = 10;
            filter = "brightness(0.7)";
            visualScale = 0.68;
          } else if (offset === total - 1) {
            transform = "translateX(-260px) scale(0.84) rotateY(24deg)";
            opacity = 0.65;
            zIndex = 20;
            filter = "brightness(0.85)";
            visualScale = 0.84;
          } else if (offset === total - 2) {
            transform = "translateX(-460px) scale(0.68) rotateY(38deg)";
            opacity = 0.38;
            zIndex = 10;
            filter = "brightness(0.7)";
            visualScale = 0.68;
          }

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
              style={{ transform, opacity, zIndex, filter, transformOrigin: "center center" }}
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
          <>
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
          </>
        ) : null}
      </div>

      {total > 1 ? (
        <div className="mt-8 flex items-center justify-center gap-2">
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
