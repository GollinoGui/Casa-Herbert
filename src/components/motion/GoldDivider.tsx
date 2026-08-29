"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { useIntroGate } from "@/components/motion/introGate";

export function GoldDivider({ className }: { className?: string }) {
  const introReady = useIntroGate();
  return (
    <svg width="140" height="12" viewBox="0 0 140 12" className={cn("mx-auto", className)} aria-hidden="true">
      <motion.path
        d="M2 6 L58 6"
        stroke="#CBB89A"
        strokeWidth="1.2"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={introReady ? { pathLength: 1, opacity: 1 } : undefined}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />
      <motion.circle
        cx="70"
        cy="6"
        r="3"
        fill="#CBB89A"
        initial={{ scale: 0, opacity: 0 }}
        whileInView={introReady ? { scale: 1, opacity: 1 } : undefined}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.85 }}
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
  );
}
