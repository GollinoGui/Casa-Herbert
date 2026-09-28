"use client";

import Image from "next/image";
import { useLiteMotion } from "@/lib/hooks/useLiteMotion";
import { HeroPhotoParallax } from "@/components/motion/HeroPhotoParallax";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { useSiteImage } from "@/components/ui/SiteImage";

interface HeroPhotoProps {
  slot: string;
  alt: string;
}

/**
 * Em celular / prefers-reduced-motion, a versão pesada (HeroPhotoParallax) nem chega a
 * montar — evita o listener de scroll e os transforms contínuos em dispositivos fracos.
 */
export function HeroPhoto({ slot, alt }: HeroPhotoProps) {
  const lite = useLiteMotion();
  const image = useSiteImage(slot);

  if (!image) {
    return <PlaceholderImage label={alt} className="aspect-[16/9] w-full shadow-soft" />;
  }

  if (lite) {
    return (
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl shadow-soft">
        <Image
          src={image.src}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          style={{ objectPosition: image.position ?? "center" }}
          priority
        />
      </div>
    );
  }

  return <HeroPhotoParallax src={image.src} alt={alt} position={image.position} />;
}
