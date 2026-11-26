"use client";

import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  widthClassName?: string;
}

const SHEET_QUERY = "(max-width: 639px)";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children, widthClassName = "max-w-lg" }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [isSheet, setIsSheet] = useState(false);
  const dragControls = useDragControls();

  useEffect(() => {
    setPortalReady(true);
    const mql = window.matchMedia(SHEET_QUERY);
    setIsSheet(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsSheet(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // No celular o painel é uma "gaveta": arrastar pela alça ou pelo título para baixo fecha.
  // Só a alça/título iniciam o arrasto, para não brigar com a rolagem do conteúdo.
  function startSheetDrag(event: ReactPointerEvent) {
    if (isSheet) dragControls.start(event);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 110 || info.velocity.y > 650) onClose();
  }

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!portalReady) return null;

  // Portal no <body>: um `fixed` dentro de um ancestral com transform (as seções
  // animadas do site) passaria a se posicionar em relação a ele, não à tela.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          data-lenis-prevent
          className="fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-brand-ink/45 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            className={`w-full ${widthClassName} max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-[28px] border-t border-brand-beige/60 bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-lift outline-none sm:max-h-[90dvh] sm:rounded-3xl sm:border sm:p-8`}
            initial={isSheet ? { y: "100%" } : { opacity: 0, y: 18, scale: 0.96 }}
            animate={isSheet ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={isSheet ? { y: "100%" } : { opacity: 0, y: 10, scale: 0.97 }}
            transition={isSheet ? { type: "spring", stiffness: 380, damping: 38 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            drag={isSheet ? "y" : false}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={handleDragEnd}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="-mx-5 -mt-5 mb-1 flex cursor-grab touch-none justify-center pb-3 pt-3 active:cursor-grabbing sm:hidden"
              onPointerDown={startSheetDrag}
              aria-hidden="true"
            >
              <div className="h-1.5 w-11 rounded-full bg-brand-beige" />
            </div>
            <div className="mb-5 flex items-center justify-between gap-3" onPointerDown={startSheetDrag}>
              {title ? (
                <h3 id={titleId} className="font-serif text-xl text-brand-forest">
                  {title}
                </h3>
              ) : (
                <span />
              )}
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="-mr-1 shrink-0 rounded-full p-2 text-brand-graphite/50 transition hover:bg-brand-beige hover:text-brand-graphite"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
