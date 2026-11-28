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
  ImageIcon,
  Settings,
  LogOut,
  ChevronDown,
  ShoppingBag,
  Truck,
  HandCoins,
  Receipt,
  Percent,
  BarChart3,
  Leaf,
  Layers,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { adminLogoutAction } from "@/lib/actions/admin/auth";
import { BotanicalBranch } from "@/components/admin/BotanicalBranch";
import { ThemeToggle } from "@/components/admin/ThemeToggle";
import { HideMoneyToggle } from "@/components/admin/HideMoneyToggle";
import { NotificationsBell } from "@/components/admin/NotificationsBell";
import { SearchButton } from "@/components/admin/SearchButton";
import { usePanelUser } from "@/components/admin/PanelUserProvider";
import { canAccessPath, ROLE_LABELS, type PanelRole } from "@/lib/auth/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string | null;
  items: NavItem[];
  siteOnly?: boolean;
}

export const NAV_GROUPS: NavGroup[] = [
  { title: null, items: [{ href: "/admin", label: "Início", icon: LayoutDashboard }] },
  {
    title: "Atendimento",
    items: [
      { href: "/admin/agenda", label: "Agenda", icon: CalendarDays },
      { href: "/admin/agendamentos", label: "Agendamentos", icon: ClipboardList },
      { href: "/admin/clientes", label: "Clientes", icon: Users },
      { href: "/admin/lista-de-espera", label: "Lista de espera", icon: ListChecks },
    ],
  },
  {
    title: "Vendas e estoque",
    items: [
      { href: "/admin/vendas", label: "Vendas", icon: ShoppingBag },
      { href: "/admin/pacotes", label: "Pacotes", icon: Layers },
      { href: "/admin/compras", label: "Compras", icon: Truck },
      { href: "/admin/estoque", label: "Estoque", icon: Package },
      { href: "/admin/servicos", label: "Serviços", icon: Sparkles },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { href: "/admin/financeiro", label: "Saldo e extrato", icon: Wallet },
      { href: "/admin/contas-a-receber", label: "Contas a receber", icon: HandCoins },
      { href: "/admin/contas-a-pagar", label: "Contas a pagar", icon: Receipt },
      { href: "/admin/comissoes", label: "Comissões", icon: Percent },
      { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
    ],
  },
  {
    title: "Ajustes",
    items: [
      { href: "/admin/bloqueios", label: "Bloqueios", icon: Ban },
      { href: "/admin/horarios-especiais", label: "Horários especiais", icon: CalendarClock },
      { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
  {
    title: "Site",
    siteOnly: true,
    items: [
      { href: "/admin/depoimentos", label: "Depoimentos", icon: MessageSquareQuote },
      { href: "/admin/fotos", label: "Fotos do site", icon: ImageIcon },
      { href: "/admin/galeria", label: "Galeria", icon: Images },
    ],
  },
];

// Compara por segmento: "/admin/agendamentos".startsWith("/admin/agenda") é true.
function isActive(href: string, pathname: string | null) {
  if (!pathname) return false;
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Grupos do menu que a pessoa pode abrir (grupo sem nenhum item liberado some). */
export function visibleNavGroups(siteEnabled: boolean, role: PanelRole): NavGroup[] {
  return NAV_GROUPS.filter((g) => siteEnabled || !g.siteOnly)
    .map((g) => ({ ...g, items: g.items.filter((item) => canAccessPath(role, item.href)) }))
    .filter((g) => g.items.length > 0);
}

export function Sidebar({ siteEnabled }: { siteEnabled: boolean }) {
  const pathname = usePathname();
  const user = usePanelUser();
  const groups = visibleNavGroups(siteEnabled, user.role);

  return (
    <>
      <MobileNav pathname={pathname} groups={groups} />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col overflow-hidden bg-gradient-to-b from-brand-pine to-brand-pineSoft text-brand-onPine lg:flex">
        <BotanicalBranch
          draw
          className="pointer-events-none absolute -bottom-6 -right-10 h-80 w-60 rotate-[-14deg] text-brand-onPine/[0.09]"
          strokeWidth={1.1}
        />
        <div className="relative flex items-center gap-3 px-6 pb-5 pt-7">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-brand-forest text-brand-ink shadow-[0_8px_20px_-8px_rgb(var(--c-forest)/0.7)]">
            <Leaf size={19} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <p className="font-serif text-xl">Casa Herbert</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-brand-onPine/60">Painel</p>
          </div>
        </div>

        <nav className="relative flex-1 space-y-5 overflow-y-auto px-3 pb-4 [scrollbar-color:rgb(var(--c-on-pine)/0.25)_transparent] [scrollbar-width:thin]" aria-label="Seções do painel">
          {groups.map((group) => (
            <div key={group.title ?? "inicio"} className="space-y-0.5">
              {group.title ? (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-onPine/50">{group.title}</p>
              ) : null}
              {group.items.map((item) => {
                const active = isActive(item.href, pathname);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-forest/70",
                      active ? "text-brand-ink" : "text-brand-onPine/80 hover:bg-brand-onPine/[0.07] hover:text-brand-onPine"
                    )}
                  >
                    {/* A pílula laranja desliza de um item para o outro (layoutId). */}
                    {active ? (
                      <motion.span
                        layoutId="nav-ativo"
                        className="absolute inset-0 rounded-xl bg-brand-forest shadow-[0_10px_24px_-12px_rgb(var(--c-forest)/0.8)]"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    ) : null}
                    <Icon
                      size={18}
                      strokeWidth={1.75}
                      className="relative shrink-0 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
                    />
                    <span className="relative">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="relative space-y-0.5 border-t border-brand-onPine/10 px-3 py-4">
          {user.name ? (
            <p className="truncate px-3 pb-2 text-xs text-brand-onPine/60">
              <span className="font-medium text-brand-onPine/85">{user.name}</span> · {ROLE_LABELS[user.role]}
            </p>
          ) : null}
          {user.role === "admin" ? (
            <HideMoneyToggle withLabel className="w-full px-3 py-2.5 text-brand-onPine/80 hover:bg-brand-onPine/[0.07] hover:text-brand-onPine" />
          ) : null}
          <form action={adminLogoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-onPine/80 transition-colors hover:bg-brand-onPine/[0.07] hover:text-brand-onPine"
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
function MobileNav({ pathname, groups }: { pathname: string | null; groups: NavGroup[] }) {
  const isAdmin = usePanelUser().role === "admin";
  const [open, setOpen] = useState(false);
  const items = groups.flatMap((g) => g.items);
  const current = items.find((item) => isActive(item.href, pathname)) ?? items[0];
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

  const order = new Map(items.map((item, i) => [item.href, i]));

  return (
    <div className="sticky top-0 z-40 lg:hidden">
      <div className="relative z-10 flex h-14 items-center justify-between gap-2 bg-gradient-to-r from-brand-pine to-brand-pineSoft px-4 text-brand-onPine shadow-[0_8px_24px_-14px_rgb(var(--c-shadow)/0.6)]">
        <Link href="/admin" className="flex min-w-0 items-center gap-2.5 leading-tight">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-brand-forest text-brand-ink">
            <Leaf size={16} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span className="hidden truncate font-serif text-base min-[400px]:block">Casa Herbert</span>
        </Link>

        <div className="flex min-w-0 items-center gap-1.5">
          <SearchButton className="h-10 w-10 shrink-0 justify-center rounded-full text-brand-onPine/85 hover:bg-brand-onPine/10" />
          {isAdmin ? (
            <HideMoneyToggle className="h-10 w-10 shrink-0 justify-center rounded-full text-brand-onPine/85 hover:bg-brand-onPine/10" />
          ) : null}
          <NotificationsBell className="h-10 w-10 shrink-0 rounded-full text-brand-onPine/85 hover:bg-brand-onPine/10" />
          <ThemeToggle className="h-10 w-10 shrink-0 justify-center rounded-full text-brand-onPine/85 hover:bg-brand-onPine/10" />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="admin-mobile-menu"
            className="flex min-w-0 items-center gap-2 rounded-full bg-brand-onPine/[0.12] py-2 pl-3 pr-2.5 text-sm font-medium transition hover:bg-brand-onPine/20 active:scale-[0.97]"
          >
            <CurrentIcon size={16} strokeWidth={1.75} className="shrink-0" />
            <span className="truncate">{current.label}</span>
            <ChevronDown size={16} className={cn("shrink-0 transition-transform duration-300", open && "rotate-180")} />
            <span className="sr-only">{open ? "Fechar menu de seções" : "Abrir menu de seções"}</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              key="overlay"
              className="fixed inset-0 top-14 bg-brand-ink/45 backdrop-blur-[2px]"
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
              className="absolute inset-x-0 top-14 max-h-[calc(100dvh-3.5rem)] origin-top overflow-y-auto overscroll-contain rounded-b-3xl bg-white px-3 pb-3 pt-3 shadow-lift"
              initial={{ opacity: 0, y: -12, scaleY: 0.96 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -10, scaleY: 0.97 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {groups.map((group) => (
                <div key={group.title ?? "inicio"} className="mb-2">
                  {group.title ? (
                    <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-graphite/50">{group.title}</p>
                  ) : null}
                  <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {group.items.map((item) => {
                      const active = isActive(item.href, pathname);
                      const Icon = item.icon;
                      return (
                        <motion.li
                          key={item.href}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 + (order.get(item.href) ?? 0) * 0.022, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex min-h-12 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors active:scale-[0.98]",
                              active ? "bg-brand-forest text-brand-ink" : "text-brand-graphite hover:bg-brand-cream active:bg-brand-beige"
                            )}
                          >
                            <Icon size={18} strokeWidth={1.75} className={cn("shrink-0", !active && "text-brand-moss")} />
                            <span className="leading-tight">{item.label}</span>
                          </Link>
                        </motion.li>
                      );
                    })}
                  </ul>
                </div>
              ))}

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
