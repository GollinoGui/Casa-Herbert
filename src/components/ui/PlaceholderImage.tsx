import { Camera } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface PlaceholderImageProps {
  label?: string;
  className?: string;
  tone?: "sage" | "cream" | "gold";
}

const toneClass: Record<NonNullable<PlaceholderImageProps["tone"]>, string> = {
  sage: "from-brand-sage/35 via-brand-cream to-brand-beige",
  cream: "from-brand-beige via-brand-cream to-brand-sage/25",
  gold: "from-brand-gold/30 via-brand-cream to-brand-sage/20",
};

/**
 * Placeholder elegante para fotos reais que serão adicionadas depois
 * (hero, galeria, resultados, produtos). Deixa claro que é um espaço
 * reservado, sem parecer um erro de carregamento.
 */
export function PlaceholderImage({ label, className, tone = "sage" }: PlaceholderImageProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br",
        toneClass[tone],
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply">
        <svg width="100%" height="100%" preserveAspectRatio="none">
          <defs>
            <pattern id="leaf-pattern" width="90" height="90" patternUnits="userSpaceOnUse">
              <path
                d="M45 10C30 20 20 38 25 55c3 10 15 16 24 14 14-3 20-16 18-30-2-14-12-24-22-29Z"
                fill="none"
                stroke="#CBB89A"
                strokeWidth="0.7"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#leaf-pattern)" />
        </svg>
      </div>
      <div className="relative flex flex-col items-center gap-2 text-brand-forest/50">
        <Camera size={28} strokeWidth={1.25} />
        {label ? <span className="text-center text-xs font-medium tracking-wide">{label}</span> : null}
      </div>
    </div>
  );
}
