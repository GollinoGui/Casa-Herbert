"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Menu,
  X,
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

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Barra superior mobile */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-brand-forestDark bg-brand-forest px-4 lg:hidden">
        <span className="font-serif text-lg text-brand-cream">Casa Herbert</span>
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="rounded-lg p-2 text-brand-cream/90 transition hover:bg-white/10"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Overlay mobile */}
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-brand-graphite/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-y-auto bg-brand-forest transition-transform duration-300 ease-out lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <div>
            <p className="font-serif text-xl text-brand-cream">Casa Herbert</p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-brand-sage">Painel Admin</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="rounded-lg p-1.5 text-brand-cream/80 transition hover:bg-white/10 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 pb-4">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/admin" ? pathname === item.href : pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
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
