import { cn } from "@/lib/utils/cn";

const GRAIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>';
const GRAIN_DATA_URI = `data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}`;

/**
 * Grão sutil pra seções de cor chapada (bg-brand-forest/moss) não ficarem
 * planas demais — o tipo de detalhe que separa "bom" de "acabado".
 */
export function GrainOverlay({ opacity = 0.06, className }: { opacity?: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 mix-blend-overlay", className)}
      style={{ opacity, backgroundImage: `url("${GRAIN_DATA_URI}")` }}
    />
  );
}
