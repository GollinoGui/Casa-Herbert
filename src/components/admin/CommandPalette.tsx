"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, Package, Search, Sparkles, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { NAV_GROUPS } from "@/components/admin/Sidebar";
import { searchPanelAction, type SearchHit } from "@/lib/actions/admin/search";

interface Row {
  key: string;
  group: string;
  title: string;
  detail?: string;
  href: string;
  icon: LucideIcon;
}

const HIT_ICON: Record<SearchHit["kind"], LucideIcon> = { cliente: User, produto: Package, servico: Sparkles };
const HIT_GROUP: Record<SearchHit["kind"], string> = { cliente: "Clientes", produto: "Produtos", servico: "Serviços" };

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Evento para abrir a busca de qualquer botão (barra do topo, celular). */
export const OPEN_SEARCH_EVENT = "painel:abrir-busca";

/**
 * Busca rápida: Ctrl+K (ou ⌘K, ou "/") abre de qualquer tela. Páginas do painel
 * filtram na hora; clientes, produtos e serviços vêm do servidor.
 */
export function CommandPalette({ siteEnabled }: { siteEnabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      if ((e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement | null;
      setQuery("");
      setHits([]);
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
      const overflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = overflow;
        previousFocus.current?.focus?.();
      };
    }
  }, [open]);

  // Busca no servidor com uma pausa curta entre teclas; descarta respostas antigas.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    let stale = false;
    setLoading(true);
    const timer = setTimeout(() => {
      searchPanelAction(q)
        .then((result) => {
          if (!stale) setHits(result);
        })
        .catch(() => {
          if (!stale) setHits([]);
        })
        .finally(() => {
          if (!stale) setLoading(false);
        });
    }, 180);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  const rows = useMemo<Row[]>(() => {
    const q = normalize(query.trim());
    const pages = NAV_GROUPS.filter((g) => siteEnabled || !g.siteOnly)
      .flatMap((g) => g.items.map((item) => ({ ...item, groupTitle: g.title ?? "Painel" })))
      .filter((item) => !q || normalize(`${item.label} ${item.groupTitle}`).includes(q))
      .slice(0, q ? 6 : 8)
      .map((item): Row => ({ key: `p-${item.href}`, group: "Ir para", title: item.label, detail: item.groupTitle, href: item.href, icon: item.icon }));
    const data = hits.map(
      (h): Row => ({ key: `${h.kind}-${h.id}`, group: HIT_GROUP[h.kind], title: h.title, detail: h.detail, href: h.href, icon: HIT_ICON[h.kind] })
    );
    return q ? [...data, ...pages] : pages;
  }, [query, hits, siteEnabled]);

  useEffect(() => setActive(0), [rows.length]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(row: Row | undefined) {
    if (!row) return;
    setOpen(false);
    router.push(row.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(rows.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(rows[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  if (!mounted) return null;

  let lastGroup = "";
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="busca"
          className="fixed inset-0 z-[90] flex items-start justify-center bg-brand-ink/45 px-4 pt-[12vh] backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Busca rápida"
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-brand-beige bg-white shadow-lift"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3 border-b border-brand-beige px-4">
              <Search size={18} className="shrink-0 text-brand-graphite/40" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Buscar cliente, produto, serviço ou página"
                aria-label="Buscar no painel"
                role="combobox"
                aria-expanded="true"
                aria-controls="busca-resultados"
                aria-activedescendant={rows[active] ? `busca-${rows[active].key}` : undefined}
                className="h-14 min-w-0 flex-1 bg-transparent text-base text-brand-graphite outline-none placeholder:text-brand-graphite/40"
              />
              <kbd className="hidden rounded-md border border-brand-beige px-1.5 py-0.5 text-[11px] text-brand-graphite/50 sm:block">Esc</kbd>
            </div>
            <ul id="busca-resultados" ref={listRef} role="listbox" className="max-h-[55vh] overflow-y-auto overscroll-contain p-2">
              {rows.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-brand-graphite/50">{loading ? "Buscando..." : "Nada encontrado."}</li>
              ) : (
                rows.map((row, i) => {
                  const header = row.group !== lastGroup ? row.group : null;
                  lastGroup = row.group;
                  const Icon = row.icon;
                  return (
                    <li key={row.key}>
                      {header ? (
                        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-graphite/50">{header}</p>
                      ) : null}
                      <button
                        type="button"
                        id={`busca-${row.key}`}
                        role="option"
                        aria-selected={i === active}
                        data-index={i}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(row)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                          i === active ? "bg-brand-cream text-brand-graphite" : "text-brand-graphite/90"
                        )}
                      >
                        <Icon size={16} strokeWidth={1.75} className="shrink-0 text-brand-moss" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate font-medium">{row.title}</span>
                        {row.detail ? <span className="hidden shrink-0 truncate text-xs text-brand-graphite/50 sm:block">{row.detail}</span> : null}
                        {i === active ? <CornerDownLeft size={14} className="shrink-0 text-brand-graphite/40" aria-hidden="true" /> : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            <p className="hidden border-t border-brand-beige px-4 py-2 text-[11px] text-brand-graphite/50 sm:block">
              ↑ ↓ para escolher · Enter para abrir · Ctrl+K abre de qualquer tela
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

/** Botão que abre a busca (o atalho de teclado funciona sem ele). */
export function SearchButton({ className, withHint }: { className?: string; withHint?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
      aria-label="Buscar (Ctrl+K)"
      title="Buscar (Ctrl+K)"
      className={cn("inline-flex items-center gap-2 transition", className)}
    >
      <Search size={17} strokeWidth={1.8} aria-hidden="true" />
      {withHint ? (
        <>
          <span className="text-sm">Buscar</span>
          <kbd className="rounded-md border border-brand-beige px-1.5 py-0.5 text-[10px] text-brand-graphite/50">Ctrl K</kbd>
        </>
      ) : null}
    </button>
  );
}
