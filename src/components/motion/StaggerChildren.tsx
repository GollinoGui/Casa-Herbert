"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useIntroGate } from "@/components/motion/introGate";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

export function StaggerContainer({ children, className }: { children: ReactNode; className?: string }) {
  const introReady = useIntroGate();
  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      whileInView={introReady ? "show" : undefined}
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}
