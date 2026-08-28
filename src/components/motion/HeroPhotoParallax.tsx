"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Lens } from "@/components/motion/Lens";

interface HeroPhotoParallaxProps {
  src: string;
  alt: string;
}

/** Versão pesada: zoom e parallax sutis atados ao scroll. Só monta em telas maiores, ver useLiteMotion. */
export function HeroPhotoParallax({ src, alt }: HeroPhotoParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -40]);

  return (
    <div ref={ref} className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl shadow-soft">
      <motion.div className="absolute inset-0" style={{ scale, y }}>
        <Lens className="relative h-full w-full" zoomFactor={1.5} lensSize={160}>
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
            priority
          />
        </Lens>
      </motion.div>
    </div>
  );
}
