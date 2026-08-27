import { cn } from "@/lib/utils/cn";

interface ParallaxLeafProps {
  className?: string;
  size?: number;
  variant?: "leaf" | "branch";
  speed?: "slow" | "normal";
}

/** Folha/ramo decorativo em SVG, com flutuação sutil via CSS (sem JS). */
export function ParallaxLeaf({ className, size = 64, variant = "leaf", speed = "normal" }: ParallaxLeafProps) {
  return (
    <div
      className={cn(
        "pointer-events-none select-none opacity-70",
        speed === "slow" ? "animate-floatSlow" : "animate-float",
        className
      )}
      aria-hidden="true"
    >
      {variant === "leaf" ? (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
          <path
            d="M32 4C18 12 8 26 12 42c3 11 14 18 24 16 14-3 20-16 18-30C52 14 42 6 32 4Z"
            stroke="#CBB89A"
            strokeWidth="1.4"
            fill="#A3B89A"
            fillOpacity="0.18"
          />
          <path d="M32 6C28 20 28 42 26 56" stroke="#CBB89A" strokeWidth="1.1" />
        </svg>
      ) : (
        <svg width={size} height={size * 1.4} viewBox="0 0 40 90" fill="none">
          <path d="M20 4V86" stroke="#CBB89A" strokeWidth="1.2" />
          <path
            d="M20 20C28 16 34 20 34 26C34 32 28 34 20 30"
            stroke="#CBB89A"
            strokeWidth="1.1"
            fill="#A3B89A"
            fillOpacity="0.15"
          />
          <path
            d="M20 46C12 42 6 46 6 52C6 58 12 60 20 56"
            stroke="#CBB89A"
            strokeWidth="1.1"
            fill="#A3B89A"
            fillOpacity="0.15"
          />
          <path
            d="M20 70C28 66 34 70 34 76C34 80 30 82 24 80"
            stroke="#CBB89A"
            strokeWidth="1.1"
            fill="#A3B89A"
            fillOpacity="0.15"
          />
        </svg>
      )}
    </div>
  );
}
