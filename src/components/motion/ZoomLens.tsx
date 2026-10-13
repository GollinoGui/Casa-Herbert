"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { useSiteImage } from "@/components/ui/SiteImage";
import { cn } from "@/lib/utils/cn";

interface ZoomLensProps {
  slot: string;
  alt: string;
  zoom?: number;
  /** Diâmetro da lupa, em px. */
  size?: number;
  className?: string;
  /** Instrução abaixo da foto ("passe o dedo…") — só aparece quando há foto para ampliar. */
  hint?: ReactNode;
}

/**
 * Foto com uma lupa que amplia o ponto sob o dedo ou o mouse. Diferente do `Lens`
 * (só hover), funciona no toque — tocar ou arrastar move a lupa — e já começa aberta
 * perto do centro, para quem não passa o mouse por cima ver o efeito mesmo assim.
 * Em fração (0–1) da caixa, não em px, para sobreviver a resize.
 */
export function ZoomLens({ slot, alt, zoom = 2.6, size = 190, className, hint }: ZoomLensProps) {
  const image = useSiteImage(slot);
  const boxRef = useRef<HTMLDivElement>(null);
  const [point, setPoint] = useState({ x: 0.55, y: 0.45 });

  if (!image) return <PlaceholderImage label={alt} className={className} />;

  const moveTo = (event: PointerEvent<HTMLDivElement>) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPoint({
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    });
  };

  const left = `${point.x * 100}%`;
  const top = `${point.y * 100}%`;
  const photo = (
    <Image
      src={image.src}
      alt=""
      fill
      sizes="(min-width: 1024px) 55vw, 100vw"
      className="object-cover"
      style={{ objectPosition: image.position ?? "center" }}
    />
  );

  return (
    <>
      <div
        ref={boxRef}
        role="img"
        aria-label={alt}
        // pan-y: no celular, arrastar na vertical continua rolando a página; o toque e o
        // arraste na horizontal movem a lupa.
        className={cn("relative cursor-crosshair touch-pan-y select-none overflow-hidden rounded-2xl", className)}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse" || event.buttons > 0) moveTo(event);
        }}
        onPointerDown={moveTo}
      >
        {photo}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            maskImage: `radial-gradient(circle ${size / 2}px at ${left} ${top}, #000 99%, transparent 100%)`,
            WebkitMaskImage: `radial-gradient(circle ${size / 2}px at ${left} ${top}, #000 99%, transparent 100%)`,
          }}
        >
          <div className="absolute inset-0" style={{ transform: `scale(${zoom})`, transformOrigin: `${left} ${top}` }}>
            {photo}
          </div>
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-cream shadow-[0_0_0_1px_rgba(46,46,46,0.25),0_10px_30px_-8px_rgba(46,46,46,0.5)]"
          style={{ left, top, width: size, height: size }}
        />
      </div>
      {hint}
    </>
  );
}
