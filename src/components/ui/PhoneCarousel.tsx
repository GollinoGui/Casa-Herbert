import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface PhoneCarouselItem {
  id: string;
  label: string;
  handle: string;
  href: string;
  icon: LucideIcon;
  tone: "sage" | "cream" | "gold";
  /** Print real da tela (ex: "/images/redes/instagram.jpg") ou arte pronta. Sem isso, usa o placeholder com ícone. */
  imageSrc?: string;
}

const toneClass: Record<PhoneCarouselItem["tone"], string> = {
  sage: "from-brand-sage/40 via-brand-cream to-brand-beige",
  cream: "from-brand-beige via-brand-cream to-brand-sage/25",
  gold: "from-brand-gold/35 via-brand-cream to-brand-sage/20",
};

/**
 * Moldura visual de um "celular" (bezel + notch + tela). Sem `imageSrc`, mostra
 * um placeholder com ícone (ver CLAUDE.md > Fotos); passar `imageSrc` troca pelo
 * print real ou arte pronta. Puramente apresentacional — quem posiciona/anima é o caller.
 */
/**
 * `compact`: versão para celulares estreitos (~100px) abaixo de `sm`, como no leque do CTA final;
 * a partir de `sm` volta ao tamanho normal.
 */
export function PhoneFrame({ item, compact = false }: { item: PhoneCarouselItem; compact?: boolean }) {
  const Icon = item.icon;
  return (
    <div
      className={cn(
        "relative bg-gradient-to-br from-neutral-600 via-brand-graphite to-neutral-900 shadow-soft ring-1 ring-inset ring-white/10 transition-shadow duration-500 group-hover:shadow-md",
        compact ? "rounded-[1.6rem] p-1.5 sm:rounded-[2.5rem] sm:p-2.5" : "rounded-[2.5rem] p-2.5"
      )}
    >
      {/* Botões laterais, só decorativos (mute + volume à esquerda, power à direita) */}
      <span className="absolute -left-[3px] top-14 h-5 w-[3px] rounded-l-sm bg-neutral-800" />
      <span className="absolute -left-[3px] top-[5.5rem] h-8 w-[3px] rounded-l-sm bg-neutral-800" />
      <span className="absolute -left-[3px] top-32 h-8 w-[3px] rounded-l-sm bg-neutral-800" />
      <span className="absolute -right-[3px] top-24 h-12 w-[3px] rounded-r-sm bg-neutral-800" />

      <div
        className={cn(
          "relative flex aspect-[9/19] flex-col items-center justify-center overflow-hidden border border-black/40 bg-gradient-to-br text-center",
          compact ? "gap-2 rounded-[1.3rem] px-2 sm:gap-4 sm:rounded-[2rem] sm:px-6" : "gap-4 rounded-[2rem] px-6",
          toneClass[item.tone]
        )}
      >
        {item.imageSrc ? (
          <Image src={item.imageSrc} alt={`Tela do ${item.label}`} fill sizes="210px" className="object-cover" />
        ) : (
          <>
            <span
              className={cn(
                "flex items-center justify-center rounded-full bg-white/85 text-brand-forest shadow-softer",
                compact ? "h-10 w-10 sm:h-14 sm:w-14" : "h-14 w-14"
              )}
            >
              <Icon size={26} strokeWidth={1.5} className={cn(compact && "h-5 w-5 sm:h-[26px] sm:w-[26px]")} />
            </span>
            <div className="min-w-0">
              <p className={cn("font-serif text-brand-forest", compact ? "text-sm sm:text-base" : "text-base")}>
                {item.label}
              </p>
              <p className={cn("mt-1 text-brand-graphite/70", compact ? "text-[10px] leading-tight sm:text-xs" : "text-xs")}>
                {item.handle}
              </p>
            </div>
            <span
              className={cn(
                "mt-1 whitespace-nowrap rounded-full bg-brand-forest font-medium text-brand-cream shadow-softer transition-transform duration-300 group-hover:scale-105",
                compact ? "px-3 py-1 text-[10px] sm:px-4 sm:py-1.5 sm:text-[11px]" : "px-4 py-1.5 text-[11px]"
              )}
            >
              {compact ? (
                <>
                  <span className="sm:hidden">Abrir</span>
                  <span className="hidden sm:inline">Toque para abrir</span>
                </>
              ) : (
                "Toque para abrir"
              )}
            </span>
          </>
        )}

        {/* Glare diagonal, só um toque de vidro/tela */}
        <div className="pointer-events-none absolute -inset-y-8 -left-1/2 w-1/3 -rotate-12 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        {/* Dynamic Island */}
        <span
          className={cn(
            "absolute left-1/2 z-20 flex -translate-x-1/2 items-center justify-end rounded-full bg-black",
            compact ? "top-2 h-4 w-10 pr-1 sm:top-3 sm:h-6 sm:w-24 sm:pr-2" : "top-3 h-6 w-24 pr-2"
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-700" />
        </span>
      </div>
    </div>
  );
}

interface PhoneCarouselProps {
  items: PhoneCarouselItem[];
  className?: string;
}

const fanClass = [
  "sm:-translate-x-16 sm:translate-y-4 sm:-rotate-6",
  "sm:z-10 sm:scale-105",
  "sm:translate-x-16 sm:translate-y-4 sm:rotate-6",
];

/**
 * Vitrine estática de 3 celulares em leque, com hover para destacar cada um.
 * Efeito é só CSS (hover), não precisa de "use client".
 */
export function PhoneCarousel({ items, className }: PhoneCarouselProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-10 sm:flex-row sm:items-center sm:justify-center sm:gap-0",
        className
      )}
    >
      {items.slice(0, 3).map((item, idx) => (
        <a
          key={item.id}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir ${item.label}`}
          className={cn(
            "group relative w-[210px] shrink-0 transition-transform duration-500 ease-out sm:hover:-translate-y-3 sm:hover:z-20 sm:hover:rotate-0 sm:hover:scale-110",
            fanClass[idx] ?? ""
          )}
        >
          <PhoneFrame item={item} />
        </a>
      ))}
    </div>
  );
}
