"use client";

import { animate, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SwipeAction {
  label: string;
  icon: LucideIcon;
  onTrigger: () => void;
  /** "accent" = laranja da marca; "leaf" = verde. */
  tone?: "accent" | "leaf";
}

const THRESHOLD = 88;

/**
 * Linha de lista com ação rápida ao arrastar para o lado (só em tela de toque).
 * `right` aparece ao arrastar para a direita, `left` para a esquerda. As mesmas ações
 * continuam acessíveis pelo toque normal na linha — o gesto é um atalho, não o único caminho.
 */
export function SwipeRow({
  children,
  left,
  right,
  className,
}: {
  children: ReactNode;
  left?: SwipeAction;
  right?: SwipeAction;
  className?: string;
}) {
  const x = useMotionValue(0);
  const [touch, setTouch] = useState(false);
  const dragged = useRef(false);

  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const rightOpacity = useTransform(x, [0, 24, THRESHOLD], [0, 0.6, 1]);
  const leftOpacity = useTransform(x, [-THRESHOLD, -24, 0], [1, 0.6, 0]);
  const rightScale = useTransform(x, [0, THRESHOLD], [0.6, 1]);
  const leftScale = useTransform(x, [-THRESHOLD, 0], [1, 0.6]);

  function onDragEnd(_: unknown, info: PanInfo) {
    const dx = info.offset.x;
    if (dx > THRESHOLD && right) right.onTrigger();
    else if (dx < -THRESHOLD && left) left.onTrigger();
    animate(x, 0, { type: "spring", stiffness: 500, damping: 36 });
    // O pointerup que encerra o arrasto ainda dispara um click na linha; ignora esse.
    setTimeout(() => (dragged.current = false), 80);
  }

  if (!touch || (!left && !right)) return <div className={className}>{children}</div>;

  const toneClass = (tone?: SwipeAction["tone"]) => (tone === "leaf" ? "bg-brand-pineSoft text-brand-onPine" : "bg-brand-forest text-brand-ink");

  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      {right ? (
        <motion.div
          className={cn("absolute inset-0 flex items-center gap-2 pl-5 text-sm font-semibold", toneClass(right.tone))}
          style={{ opacity: rightOpacity }}
          aria-hidden="true"
        >
          <motion.span style={{ scale: rightScale }} className="flex items-center gap-2">
            <right.icon size={18} /> {right.label}
          </motion.span>
        </motion.div>
      ) : null}
      {left ? (
        <motion.div
          className={cn("absolute inset-0 flex items-center justify-end gap-2 pr-5 text-sm font-semibold", toneClass(left.tone))}
          style={{ opacity: leftOpacity }}
          aria-hidden="true"
        >
          <motion.span style={{ scale: leftScale }} className="flex items-center gap-2">
            {left.label} <left.icon size={18} />
          </motion.span>
        </motion.div>
      ) : null}
      <motion.div
        className="relative"
        style={{ x, touchAction: "pan-y" }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: left ? -140 : 0, right: right ? 140 : 0 }}
        dragElastic={0.18}
        dragMomentum={false}
        onDragStart={() => (dragged.current = true)}
        onDragEnd={onDragEnd}
        onClickCapture={(e) => {
          if (dragged.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
