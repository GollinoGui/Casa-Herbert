"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Leaf, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  /** Passo a passo curto de "como usar" esta seção. */
  guide?: ReactNode[];
  /** Chave para lembrar se o guia está aberto ou fechado neste navegador. */
  guideKey?: string;
  actions?: ReactNode;
}

/**
 * Título da seção + guia "Como usar". O guia começa aberto na primeira visita e
 * depois lembra a escolha do Herbert (localStorage, só conveniência).
 */
export function PageHeader({ eyebrow, title, guide, guideKey, actions }: PageHeaderProps) {
  const storageKey = guideKey ? `guia:${guideKey}` : null;
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!storageKey) return;
    try {
      if (localStorage.getItem(storageKey) === "fechado") setOpen(false);
    } catch {
      // navegador sem storage: guia fica aberto
    }
  }, [storageKey]);

  function toggle() {
    setOpen((v) => {
      const next = !v;
      try {
        if (storageKey) localStorage.setItem(storageKey, next ? "aberto" : "fechado");
      } catch {
        // ignora
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow mb-2 inline-flex items-center gap-1.5">
            <Leaf size={12} className="shrink-0" aria-hidden="true" />
            {eyebrow}
          </p>
          <h1 className="text-balance font-serif text-[1.75rem] leading-tight tracking-[-0.01em] text-brand-forest sm:text-4xl">{title}</h1>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      {guide?.length ? (
        <div className="overflow-hidden rounded-2xl border border-brand-sage/40 bg-brand-sage/10">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-brand-graphite"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-brand-moss shadow-softer">
              <Lightbulb size={14} aria-hidden="true" />
            </span>
            Como usar esta seção
            <ChevronDown size={16} className={cn("ml-auto shrink-0 transition-transform duration-300", open && "rotate-180")} />
          </button>
          <AnimatePresence initial={false}>
            {open ? (
              <motion.ol
                key="guia"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-1.5 px-4 text-sm text-brand-graphite/80"
              >
                {guide.map((step, i) => (
                  <motion.li
                    key={i}
                    className="flex gap-2.5 last:pb-4"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 + i * 0.05, duration: 0.3 }}
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-brand-moss">
                      {i + 1}
                    </span>
                    <span className="max-w-[70ch]">{step}</span>
                  </motion.li>
                ))}
              </motion.ol>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}
    </div>
  );
}
