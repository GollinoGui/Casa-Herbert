"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export function GoldDivider({ className }: { className?: string }) {
  return (
    <svg width="140" height="12" viewBox="0 0 140 12" className={cn("mx-auto", className)} aria-hidden="true">
      <motion.path
        d="M2 6 L58 6"
        stroke="#CBB89A"
        strokeWidth="1.2"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
      <motion.circle
        cx="70"
        cy="6"
        r="3"
        fill="#CBB89A"
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.7 }}
      />
      <motion.path
        d="M82 6 L138 6"
        stroke="#CBB89A"
        strokeWidth="1.2"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
      />
    </svg>
  );
}
