import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface FloatingIconProps {
  icon: LucideIcon;
  className?: string;
  size?: number;
  speed?: "slow" | "normal";
  rotate?: number;
}

/** Ícone decorativo (tesoura, spray, etc.) flutuando sutilmente via CSS, sem JS. */
export function FloatingIcon({ icon: Icon, className, size = 32, speed = "normal", rotate = 0 }: FloatingIconProps) {
  return (
    <div
      className={cn("pointer-events-none select-none", speed === "slow" ? "animate-floatSlow" : "animate-float", className)}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <Icon size={size} strokeWidth={1.25} />
    </div>
  );
}
