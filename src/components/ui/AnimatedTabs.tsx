"use client";

import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface AnimatedTab {
  id: string;
  label: string;
  content: ReactNode;
}

interface AnimatedTabsProps {
  tabs: AnimatedTab[];
  defaultTab?: string;
  ariaLabel?: string;
  className?: string;
}

export function AnimatedTabs({ tabs, defaultTab, ariaLabel, className }: AnimatedTabsProps) {
  const highlightId = useId();
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);
  const activeTab = tabs.find((tab) => tab.id === active) ?? tabs[0];

  if (!tabs.length || !activeTab) return null;

  return (
    <div className={className}>
      <div className="flex justify-center">
        <div
          role="tablist"
          aria-label={ariaLabel}
          className="flex flex-wrap justify-center gap-2 rounded-full border border-brand-gold/30 bg-white/40 p-1.5 shadow-soft backdrop-blur-md"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === active;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(tab.id)}
                className={cn(
                  "relative rounded-full px-5 py-2.5 text-sm font-medium outline-none transition-colors duration-300",
                  isActive ? "text-brand-cream" : "text-brand-graphite/70 hover:bg-brand-forest/5"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId={`${highlightId}-highlight`}
                    className="absolute inset-0 rounded-full bg-brand-forest shadow-soft"
                    transition={{ type: "spring", duration: 0.6, bounce: 0.15 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        className="mt-8 overflow-hidden rounded-3xl border border-brand-gold/20 bg-white/50 p-6 shadow-soft backdrop-blur-md sm:p-10"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab.id}
            initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeTab.content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
