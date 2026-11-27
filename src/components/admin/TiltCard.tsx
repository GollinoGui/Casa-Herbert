"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const MAX_TILT = 9;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Cartão com inclinação 3D seguindo o ponteiro pela tela inteira (só com mouse
 * e sem prefers-reduced-motion), com brilho que acompanha a posição.
 */
export function TiltCard({ className, children }: { className?: string; children: ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const { clientX, clientY } = event;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        // Limitado para o cartão não "virar" demais com o ponteiro longe dele.
        const x = clamp((clientX - rect.left) / rect.width, -0.5, 1.5);
        const y = clamp((clientY - rect.top) / rect.height, -0.5, 1.5);
        card.style.setProperty("--rx", `${clamp(0.5 - y, -0.5, 0.5) * 2 * MAX_TILT}deg`);
        card.style.setProperty("--ry", `${clamp(x - 0.5, -0.5, 0.5) * 2 * MAX_TILT}deg`);
        card.style.setProperty("--gx", `${x * 100}%`);
        card.style.setProperty("--gy", `${y * 100}%`);
        card.style.setProperty("--glare", "1");
      });
    };

    const leave = () => {
      cancelAnimationFrame(frame);
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
      card.style.setProperty("--glare", "0");
    };

    window.addEventListener("pointermove", move);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div style={{ perspective: "1200px" }}>
      <div
        ref={cardRef}
        className={cn("relative transition-transform duration-300 ease-out", className)}
        style={{
          transform: "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
          transformStyle: "preserve-3d",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
          style={{
            opacity: "var(--glare, 0)",
            background:
              "radial-gradient(circle at var(--gx, 50%) var(--gy, 0%), rgb(255 255 255 / 0.12), transparent 55%)",
          }}
        />
        <div className="relative" style={{ transform: "translateZ(40px)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
