import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/admin/Sidebar";
import { ShortcutBar } from "@/components/admin/ShortcutBar";
import { NotificationsBell } from "@/components/admin/NotificationsBell";
import { ThemeToggle } from "@/components/admin/ThemeToggle";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { SearchButton } from "@/components/admin/SearchButton";
import { FinanceOptionsProvider } from "@/components/admin/FinanceOptionsProvider";
import { getFinanceOptions } from "@/lib/data/finance-options";
import { isSiteEnabled } from "@/lib/site";
import { getPanelUser } from "@/lib/auth/require-admin";
import { PanelUserProvider } from "@/components/admin/PanelUserProvider";

export default async function AdminShellLayout({ children }: { children: ReactNode }) {
  // O middleware já barrou quem não tem ficha; aqui o papel só decide o menu.
  const [user, financeOptions] = await Promise.all([getPanelUser(), getFinanceOptions()]);
  if (!user) redirect("/admin/login");
  return (
    <PanelUserProvider value={{ name: user.name, role: user.role }}>
      <FinanceOptionsProvider value={financeOptions}>
        {/* relative z-[1]: acima do grão fixo do body.painel (globals.css). */}
        <div className="relative z-[1] min-h-screen">
          <Sidebar siteEnabled={isSiteEnabled()} />
          <div className="lg:pl-72">
            {/* No celular, sino e tema ficam na barra do topo (Sidebar > MobileNav). */}
            <div className="relative z-20 mx-auto hidden max-w-[1500px] items-center justify-end gap-2 px-10 pt-6 lg:flex 2xl:px-14">
              <SearchButton
                withHint
                className="h-10 rounded-full border border-brand-beige bg-white px-4 text-brand-moss shadow-softer hover:text-brand-forest"
              />
              <NotificationsBell className="h-10 w-10 rounded-full border border-brand-beige bg-white text-brand-moss shadow-softer hover:text-brand-forest" />
              <ThemeToggle className="h-10 w-10 justify-center rounded-full border border-brand-beige bg-white shadow-softer hover:bg-brand-cream" />
            </div>
            {/* O pb soma a altura da barra de atalhos do celular (--barra-atalhos, globals.css). */}
            <main
              id="conteudo"
              className="mx-auto min-h-screen max-w-[1500px] p-4 pb-[calc(3rem+var(--barra-atalhos))] sm:p-6 sm:pb-[calc(3rem+var(--barra-atalhos))] lg:p-10 lg:pt-2 2xl:px-14"
            >
              {children}
            </main>
          </div>
          <ShortcutBar />
          <CommandPalette siteEnabled={isSiteEnabled()} />
        </div>
      </FinanceOptionsProvider>
    </PanelUserProvider>
  );
}
