"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Banknote,
  Bell,
  ListChecks,
  Undo2,
  Cake,
  CalendarClock,
  ChevronRight,
  MessageCircle,
  Package,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getPanelNotificationsAction } from "@/lib/actions/admin/notifications";
import type { NotificationKind, PanelNotification } from "@/lib/data/notifications";

const ICONS: Record<NotificationKind, LucideIcon> = {
  overdue: AlertTriangle,
  pending: CalendarClock,
  reminders: MessageCircle,
  payables: Receipt,
  stock: Package,
  birthdays: Cake,
  returns: Undo2,
  waitlist: ListChecks,
  cashClosing: Banknote,
};

const SEEN_KEY = "painel-avisos-vistos";
const signature = (list: PanelNotification[]) => list.map((n) => `${n.kind}:${n.count}`).join("|");

function readSeen() {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Sino de avisos do painel: busca ao montar, ao trocar de página, ao voltar
 * para a aba e ao abrir. O número some depois de abrir e só volta quando os
 * avisos mudam (assinatura guardada neste navegador, só conveniência).
 */
export function NotificationsBell({ className }: { className?: string }) {
  const pathname = usePathname();
  const [items, setItems] = useState<PanelNotification[] | null>(null);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setItems(await getPanelNotificationsAction());
    } catch {
      // sem conexão: mantém o que já tinha
    }
  }, []);

  useEffect(() => {
    setSeen(readSeen());
  }, []);

  useEffect(() => {
    load();
    setOpen(false);
  }, [pathname, load]);

  useEffect(() => {
    const onFocus = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !items) return;
    const sig = signature(items);
    setSeen(sig);
    try {
      localStorage.setItem(SEEN_KEY, sig);
    } catch {
      // ignora
    }
  }, [open, items]);

  const total = items?.length ?? 0;
  const unseen = total > 0 && items !== null && signature(items) !== seen;
  const urgent = items?.some((n) => n.tone === "alerta") ?? false;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={total ? `Avisos: ${total} ${total === 1 ? "novo" : "novos"}` : "Avisos"}
        title="Avisos"
        className={cn("relative flex items-center justify-center transition-colors active:scale-[0.97]", className)}
      >
        <Bell size={18} strokeWidth={1.75} aria-hidden="true" className={cn(unseen && "origin-top animate-[sino_1.2s_ease-in-out_1]")} />
        <AnimatePresence>
          {unseen ? (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 26 }}
              className={cn(
                "absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none",
                urgent ? "bg-red-600 text-snow" : "bg-brand-forest text-brand-ink"
              )}
              aria-hidden="true"
            >
              {total}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="painel"
            role="dialog"
            aria-label="Avisos"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="z-50 origin-top-right overflow-hidden rounded-2xl border border-brand-beige bg-white text-brand-graphite shadow-lift max-lg:fixed max-lg:inset-x-4 max-lg:top-16 lg:absolute lg:right-0 lg:top-full lg:mt-2 lg:w-96"
          >
            <div className="flex items-center justify-between border-b border-brand-beige px-4 py-3">
              <p className="font-serif text-lg text-brand-forest">Avisos</p>
              {total ? <span className="text-xs text-brand-graphite/60">{total === 1 ? "1 item" : `${total} itens`}</span> : null}
            </div>

            {items === null ? (
              <p className="px-4 py-6 text-sm text-brand-graphite/60">Carregando…</p>
            ) : total === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-sage/20 text-brand-moss">
                  <Bell size={18} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <p className="text-sm font-medium">Tudo em dia</p>
                <p className="text-xs text-brand-graphite/60">Nenhum pedido, conta ou estoque pedindo atenção.</p>
              </div>
            ) : (
              <ul className="max-h-[min(26rem,calc(100dvh-8rem))] overflow-y-auto p-1.5">
                {items.map((n, i) => {
                  const Icon = ICONS[n.kind];
                  return (
                    <motion.li
                      key={n.kind}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 + i * 0.035, duration: 0.25 }}
                    >
                      <Link
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className="group flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-brand-cream"
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                            n.tone === "alerta" ? "bg-red-50 text-red-700" : "bg-brand-sage/20 text-brand-moss"
                          )}
                        >
                          <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{n.title}</span>
                          <span className="block truncate text-xs text-brand-graphite/60">{n.detail}</span>
                        </span>
                        <ChevronRight
                          size={16}
                          className="shrink-0 text-brand-graphite/40 transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
