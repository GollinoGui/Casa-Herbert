"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Users,
  Sparkles,
  Package,
  Wallet,
  Ban,
  CalendarClock,
  MessageSquareQuote,
  Images,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { adminLogoutAction } from "@/lib/actions/admin/auth";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/admin/agendamentos", label: "Agendamentos", icon: ClipboardList },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/servicos", label: "Serviços", icon: Sparkles },
  { href: "/admin/estoque", label: "Estoque", icon: Package },
  { href: "/admin/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/admin/bloqueios", label: "Bloqueios", icon: Ban },
  { href: "/admin/horarios-especiais", label: "Horários Especiais", icon: CalendarClock },
  { href: "/admin/depoimentos", label: "Depoimentos", icon: MessageSquareQuote },
  { href: "/admin/galeria", label: "Galeria", icon: Images },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
] as const;

// Compara por segmento: "/admin/agendamentos".startsWith("/admin/agenda") é true.
function isActive(href: string, pathname: string | null) {
  if (!pathname) return false;
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <MobileNav pathname={pathname} />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col overflow-y-auto bg-brand-forest lg:flex">
        <div className="px-6 py-6">
          <p className="font-serif text-xl text-brand-cream">Casa Herbert</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-sage">Painel Admin</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 pb-4">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-cream text-brand-forest"
                    : "text-brand-cream/80 hover:bg-white/10 hover:text-brand-cream"
                )}
              >
                <Icon size={18} strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <form action={adminLogoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-cream/80 transition-colors hover:bg-white/10 hover:text-brand-cream"
            >
              <LogOut size={18} strokeWidth={1.75} />
              Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

/**
 * Abaixo de `lg`: barra fixa no topo com a seção atual; tocar nela abre um
 * menu suspenso com todas as seções em grade (cabe sem rolar na maioria dos
 * celulares e fica ao alcance do polegar mais cedo que uma gaveta lateral).
 */
function MobileNav({ pathname }: { pathname: string | null }) {
  const [open, setOpen] = useState(false);
  const current = NAV_ITEMS.find((item) => isActive(item.href, pathname)) ?? NAV_ITEMS[0];
  const CurrentIcon = current.icon;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="sticky top-0 z-40 lg:hidden">
      <div className="relative z-10 flex h-14 items-center justify-between gap-3 border-b border-brand-forestDark/40 bg-brand-forest px-4 shadow-softer">
        <Link href="/admin" className="min-w-0 leading-tight">
          <span className="block truncate font-serif text-base text-brand-graphite">Casa Herbert</span>
          <span className="block text-[10px] uppercase tracking-[0.2em] text-brand-graphite/70">Painel Admin</span>
        </Link>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-mobile-menu"
          className="flex min-w-0 items-center gap-2 rounded-full bg-white/25 py-2 pl-3 pr-2.5 text-sm font-medium text-brand-graphite transition hover:bg-white/35 active:scale-[0.98]"
        >
          <CurrentIcon size={16} strokeWidth={1.75} className="shrink-0" />
          <span className="truncate">{current.label}</span>
          <ChevronDown
            size={16}
            className={cn("shrink-0 transition-transform duration-200", open && "rotate-180")}
          />
          <span className="sr-only">{open ? "Fechar menu de seções" : "Abrir menu de seções"}</span>
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              key="overlay"
              className="fixed inset-0 top-14 bg-brand-graphite/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.nav
              key="menu"
              id="admin-mobile-menu"
              aria-label="Seções do painel"
              className="absolute inset-x-0 top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain rounded-b-2xl bg-white px-3 pb-3 pt-3 shadow-xl"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(item.href, pathname);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-12 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-brand-forest/15 text-brand-forestDark"
                            : "text-brand-graphite hover:bg-brand-cream active:bg-brand-beige"
                        )}
                      >
                        <Icon size={18} strokeWidth={1.75} className={cn("shrink-0", !active && "text-brand-moss")} />
                        <span className="leading-tight">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <form action={adminLogoutAction} className="mt-2 border-t border-brand-beige pt-2">
                <button
                  type="submit"
                  className="flex min-h-12 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-graphite/70 transition-colors hover:bg-brand-cream hover:text-brand-graphite"
                >
                  <LogOut size={18} strokeWidth={1.75} />
                  Sair
                </button>
              </form>
            </motion.nav>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
