import type { ReactNode } from "react";
import { Sidebar } from "@/components/admin/Sidebar";
import { ShortcutBar } from "@/components/admin/ShortcutBar";
import { FinanceOptionsProvider } from "@/components/admin/FinanceOptionsProvider";
import { getFinanceOptions } from "@/lib/data/finance-options";
import { isSiteEnabled } from "@/lib/site";

export default async function AdminShellLayout({ children }: { children: ReactNode }) {
  const financeOptions = await getFinanceOptions();
  return (
    <FinanceOptionsProvider value={financeOptions}>
      {/* relative z-[1]: acima do grão fixo do body.painel (globals.css). */}
      <div className="relative z-[1] min-h-screen">
        <Sidebar siteEnabled={isSiteEnabled()} />
        <div className="lg:pl-72">
          {/* O pb soma a altura da barra de atalhos do celular (--barra-atalhos, globals.css). */}
          <main
            id="conteudo"
            className="mx-auto min-h-screen max-w-[1500px] p-4 pb-[calc(3rem+var(--barra-atalhos))] sm:p-6 sm:pb-[calc(3rem+var(--barra-atalhos))] lg:p-10 2xl:px-14"
          >
            {children}
          </main>
        </div>
        <ShortcutBar />
      </div>
    </FinanceOptionsProvider>
  );
}
