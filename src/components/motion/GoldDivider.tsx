"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { useIntroGate } from "@/components/motion/introGate";
import { ScissorCombIcon } from "@/components/icons/ScissorCombIcon";

export function GoldDivider({ className }: { className?: string }) {
  const introReady = useIntroGate();
  return (
    <div
      aria-hidden="true"
      className={cn("relative mx-auto flex h-4 w-[140px] items-center justify-center", className)}
    >
      <svg width="140" height="12" viewBox="0 0 140 12" className="absolute inset-0">
        <motion.path
          d="M2 6 L58 6"
          stroke="#CBB89A"
          strokeWidth="1.2"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={introReady ? { pathLength: 1, opacity: 1 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
        <motion.path
          d="M82 6 L138 6"
          stroke="#CBB89A"
          strokeWidth="1.2"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={introReady ? { pathLength: 1, opacity: 1 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.18 }}
        />
      </svg>
      <motion.span
        initial={{ scale: 0, opacity: 0 }}
        whileInView={introReady ? { scale: 1, opacity: 1 } : undefined}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.85 }}
        className="relative flex items-center justify-center text-brand-gold"
      >
        <ScissorCombIcon className="h-3.5 w-3.5 rotate-90" />
      </motion.span>
    </div>
  );
}
