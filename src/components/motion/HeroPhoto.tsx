"use client";

import Image from "next/image";
import { useLiteMotion } from "@/lib/hooks/useLiteMotion";
import { HeroPhotoParallax } from "@/components/motion/HeroPhotoParallax";

interface HeroPhotoProps {
  src: string;
  alt: string;
}

/**
 * Em celular / prefers-reduced-motion, a versão pesada (HeroPhotoParallax) nem chega a
 * montar — evita o listener de scroll e os transforms contínuos em dispositivos fracos.
 */
export function HeroPhoto({ src, alt }: HeroPhotoProps) {
  const lite = useLiteMotion();

  if (lite) {
    return (
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl shadow-soft">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          priority
        />
      </div>
    );
  }

  return <HeroPhotoParallax src={src} alt={alt} />;
}
