"use client";

import Image from "next/image";
import { createContext, useContext, type ReactNode } from "react";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { cn } from "@/lib/utils/cn";
import type { ResolvedImage } from "@/types";

/**
 * Fotos escolhidas no painel (/admin/fotos), por chave de src/lib/site-images/slots.ts.
 * Carregadas uma vez no layout raiz e lidas por qualquer componente, server ou client.
 */
const SiteImagesContext = createContext<Record<string, ResolvedImage>>({});

export function SiteImagesProvider({ images, children }: { images: Record<string, ResolvedImage>; children: ReactNode }) {
  return <SiteImagesContext.Provider value={images}>{children}</SiteImagesContext.Provider>;
}

export function useSiteImage(slot: string): ResolvedImage | null {
  return useContext(SiteImagesContext)[slot] ?? null;
}

interface SiteImageProps {
  slot: string;
  alt: string;
  /** Tamanho/proporção do espaço (ex.: "aspect-[4/3] w-full") — vale para a foto e para o placeholder. */
  className?: string;
  sizes: string;
  placeholderLabel?: string;
  placeholderTone?: "sage" | "cream" | "gold";
  priority?: boolean;
}

/** Foto do espaço `slot`, ou o PlaceholderImage enquanto nenhuma foi escolhida no painel. */
export function SiteImage({ slot, alt, className, sizes, placeholderLabel, placeholderTone, priority }: SiteImageProps) {
  const image = useSiteImage(slot);
  if (!image) return <PlaceholderImage label={placeholderLabel ?? alt} tone={placeholderTone} className={className} />;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      <Image
        src={image.src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
        style={{ objectPosition: image.position ?? "center" }}
      />
    </div>
  );
}
