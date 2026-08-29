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
export function PhoneFrame({ item }: { item: PhoneCarouselItem }) {
  const Icon = item.icon;
  return (
    <div className="relative rounded-[2.5rem] bg-gradient-to-br from-neutral-600 via-brand-graphite to-neutral-900 p-2.5 shadow-soft ring-1 ring-inset ring-white/10 transition-shadow duration-500 group-hover:shadow-md">
      {/* Botões laterais, só decorativos (mute + volume à esquerda, power à direita) */}
      <span className="absolute -left-[3px] top-14 h-5 w-[3px] rounded-l-sm bg-neutral-800" />
      <span className="absolute -left-[3px] top-[5.5rem] h-8 w-[3px] rounded-l-sm bg-neutral-800" />
      <span className="absolute -left-[3px] top-32 h-8 w-[3px] rounded-l-sm bg-neutral-800" />
      <span className="absolute -right-[3px] top-24 h-12 w-[3px] rounded-r-sm bg-neutral-800" />

      <div
        className={cn(
          "relative flex aspect-[9/19] flex-col items-center justify-center gap-4 overflow-hidden rounded-[2rem] border border-black/40 bg-gradient-to-br px-6 text-center",
          toneClass[item.tone]
        )}
      >
        {item.imageSrc ? (
          <Image src={item.imageSrc} alt={`Tela do ${item.label}`} fill sizes="210px" className="object-cover" />
        ) : (
          <>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/85 text-brand-forest shadow-softer">
              <Icon size={26} strokeWidth={1.5} />
            </span>
            <div>
              <p className="font-serif text-base text-brand-forest">{item.label}</p>
              <p className="mt-1 text-xs text-brand-graphite/70">{item.handle}</p>
            </div>
            <span className="mt-1 rounded-full bg-brand-forest px-4 py-1.5 text-[11px] font-medium text-brand-cream shadow-softer transition-transform duration-300 group-hover:scale-105">
              Toque para abrir
            </span>
          </>
        )}

        {/* Glare diagonal, só um toque de vidro/tela */}
        <div className="pointer-events-none absolute -inset-y-8 -left-1/2 w-1/3 -rotate-12 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        {/* Dynamic Island */}
        <span className="absolute left-1/2 top-3 z-20 flex h-6 w-24 -translate-x-1/2 items-center justify-end rounded-full bg-black pr-2">
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
