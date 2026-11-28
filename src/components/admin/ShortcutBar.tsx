"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  HandCoins,
  LayoutDashboard,
  Package,
  Plus,
  Receipt,
  ReceiptText,
  ShoppingBag,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SHORTCUTS, useDevicePrefs, useDevicePrefsReady, type ShortcutId } from "@/lib/panel/device";
import { SaleModal } from "@/components/admin/SaleModal";
import { ReceiptSaleModal } from "@/components/admin/ReceiptSaleModal";
import { NewAppointmentModal } from "@/components/admin/NewAppointmentModal";
import { usePanelUser } from "@/components/admin/PanelUserProvider";
import { canAccessPath, type PanelRole } from "@/lib/auth/permissions";

type ActionId = "sale" | "receipt" | "appointment";

export const SHORTCUT_TARGETS: Record<ShortcutId, { icon: LucideIcon; href?: string; action?: ActionId; short?: string }> = {
  inicio: { icon: LayoutDashboard, href: "/admin" },
  agenda: { icon: CalendarDays, href: "/admin/agenda" },
  agendamentos: { icon: ClipboardList, href: "/admin/agendamentos", short: "Pedidos" },
  clientes: { icon: Users, href: "/admin/clientes" },
  novaVenda: { icon: Plus, action: "sale", short: "Vender" },
  comprovante: { icon: ReceiptText, action: "receipt" },
  novoAgendamento: { icon: CalendarPlus, action: "appointment", short: "Agendar" },
  vendas: { icon: ShoppingBag, href: "/admin/vendas" },
  estoque: { icon: Package, href: "/admin/estoque" },
  financeiro: { icon: Wallet, href: "/admin/financeiro", short: "Saldo" },
  receber: { icon: HandCoins, href: "/admin/contas-a-receber", short: "A receber" },
  pagar: { icon: Receipt, href: "/admin/contas-a-pagar", short: "A pagar" },
  relatorios: { icon: BarChart3, href: "/admin/relatorios" },
};

/** Venda e comprovante são do administrador; páginas seguem a mesma regra do menu. */
export function canUseShortcut(id: ShortcutId, role: PanelRole): boolean {
  const target = SHORTCUT_TARGETS[id];
  if (target.href) return canAccessPath(role, target.href);
  return role === "admin" || target.action === "appointment";
}

function isActive(href: string, pathname: string | null) {
  if (!pathname) return false;
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Abaixo de `lg`: atalhos fixos embaixo, ao alcance do polegar, escolhidos em
 * Configurações > Este aparelho. Ações (venda, comprovante, agendamento) abrem
 * o modal aqui mesmo, em qualquer página.
 */
export function ShortcutBar() {
  const pathname = usePathname();
  const router = useRouter();
  const prefs = useDevicePrefs();
  const ready = useDevicePrefsReady();
  const [action, setAction] = useState<ActionId | null>(null);

  const { role } = usePanelUser();
  const ids = prefs.shortcutBar ? prefs.shortcuts.filter((id) => canUseShortcut(id, role)) : [];
  const done = () => {
    setAction(null);
    router.refresh();
  };

  return (
    <>
      <nav
        aria-label="Atalhos"
        className="barra-atalhos fixed inset-x-0 bottom-0 z-30 border-t border-brand-beige bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_-18px_rgb(var(--c-shadow)/0.45)] backdrop-blur-md lg:hidden"
      >
        {/* Antes da hidratação o React só conhece o padrão: a barra fica vazia (mesma altura) em vez de piscar outros atalhos. */}
        <ul
          className="mx-auto grid h-[4.25rem] max-w-xl items-stretch px-1.5"
          style={{ gridTemplateColumns: `repeat(${Math.max(ids.length, 1)}, minmax(0, 1fr))` }}
        >
          {ready
            ? ids.map((id) => {
                const target = SHORTCUT_TARGETS[id];
                const Icon = target.icon;
                const label = target.short ?? SHORTCUTS[id];
                const active = target.href ? isActive(target.href, pathname) : false;
                const inner = (
                  <>
                    {active ? (
                      <motion.span
                        layoutId="atalho-ativo"
                        className="absolute inset-x-2 top-1.5 h-8 rounded-full bg-brand-forest"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    ) : null}
                    <span className="relative flex h-8 items-center justify-center">
                      <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span className="relative w-full truncate px-0.5 text-center text-[11px] font-medium leading-tight">{label}</span>
                  </>
                );
                const cls = cn(
                  "relative flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-2xl pt-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-forest/60 active:scale-[0.96]",
                  active ? "text-brand-ink" : "text-brand-graphite/75 hover:text-brand-graphite"
                );
                return (
                  <li key={id} className="min-w-0">
                    {target.href ? (
                      <Link href={target.href} aria-current={active ? "page" : undefined} className={cls}>
                        {inner}
                      </Link>
                    ) : (
                      <button type="button" onClick={() => setAction(target.action!)} className={cls}>
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })
            : null}
        </ul>
      </nav>

      {role === "admin" ? (
        <>
          <SaleModal open={action === "sale"} onClose={() => setAction(null)} onCompleted={done} />
          <ReceiptSaleModal open={action === "receipt"} onClose={() => setAction(null)} onCompleted={done} />
        </>
      ) : null}
      <NewAppointmentModal open={action === "appointment"} onClose={() => setAction(null)} onCreated={done} />
    </>
  );
}
