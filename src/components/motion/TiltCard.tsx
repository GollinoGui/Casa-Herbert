"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const MAX_TILT_DEGREES = 10;

/**
 * Inclinação 3D sutil seguindo o cursor. Só reage a mousemove — em touch (celular)
 * fica naturalmente inerte, sem custo nenhum.
 */
export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = ((e.clientX - left) / width - 0.5) * 2;
    const y = ((e.clientY - top) / height - 0.5) * 2;
    el.style.transform = `rotateY(${x * MAX_TILT_DEGREES}deg) rotateX(${-y * MAX_TILT_DEGREES}deg)`;
  }

  function handleMouseLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "rotateY(0deg) rotateX(0deg)";
  }

  return (
    <div className="[perspective:900px]">
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "transition-transform duration-200 ease-out [transform-style:preserve-3d] hover:shadow-soft",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
