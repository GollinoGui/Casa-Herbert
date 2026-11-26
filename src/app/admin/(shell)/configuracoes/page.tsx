import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Globe, MessageSquareText, Smartphone, Store, Wallet, type LucideIcon } from "lucide-react";
import { getPanelPreferences, getSettings } from "@/lib/data/settings";
import { getBusinessHours } from "@/lib/data/business-hours";
import { getFinanceOptions, getPayableCategoryUsage } from "@/lib/data/finance-options";
import { PageHeader } from "@/components/admin/PageHeader";
import { PanelPreferencesForm } from "@/components/admin/PanelPreferencesForm";
import { DevicePrefsForm } from "@/components/admin/DevicePrefsForm";
import { PayableCategoriesForm, PaymentMethodsForm } from "@/components/admin/FinanceListsForm";
import { SalonSettings, SiteSettings } from "@/components/admin/SettingsManager";
import { cn } from "@/lib/utils/cn";
import { isSiteEnabled } from "@/lib/site";

export const metadata: Metadata = { title: "Configurações" };

function getTabs(siteEnabled: boolean): { id: string; label: string; icon: LucideIcon }[] {
  return [
    { id: "painel", label: "Painel e gráficos", icon: BarChart3 },
    { id: "aparelho", label: "Este aparelho", icon: Smartphone },
    { id: "financeiro", label: "Financeiro", icon: Wallet },
    { id: "salao", label: "Salão e agenda", icon: Store },
    siteEnabled
      ? { id: "site", label: "Site e mensagens", icon: Globe }
      : { id: "site", label: "Mensagens", icon: MessageSquareText },
  ];
}

function getGuides(siteEnabled: boolean): Record<string, React.ReactNode[]> {
  return {
    painel: [
      <>Ligue ou desligue cada cartão e gráfico do <strong>Início</strong> e dos <strong>Relatórios</strong>, e use as setas para mudar a ordem do Início.</>,
      <>Aqui também ficam os prazos dos avisos, as linhas da agenda e a forma de pagamento que já vem marcada.</>,
      <>Esconder não apaga nada: os números continuam sendo calculados e voltam quando você liga de novo.</>,
      <>Clique em <strong>Salvar preferências</strong>. “Mostrar tudo de novo” volta ao padrão.</>,
    ],
    aparelho: [
      <>Escolha até 5 atalhos para a barra de baixo do celular, o tamanho do texto e como a agenda abre.</>,
      <>Vale só para este aparelho e é salvo na hora — cada celular ou computador tem o seu.</>,
    ],
    financeiro: [
      <>Desligue as formas de pagamento que o salão não aceita e ajuste os nomes como preferir.</>,
      <>Crie, renomeie, reordene ou desative as categorias usadas em Contas a pagar.</>,
      <>O que já foi lançado não muda — só as opções para os próximos lançamentos.</>,
    ],
    salao: [
      <>WhatsApp, endereço e redes sociais aparecem no site e nas mensagens.</>,
      <>As regras de agendamento e o horário semanal definem quais horários os clientes podem escolher.</>,
    ],
    site: [
      ...(siteEnabled ? [<>O aviso aparece numa faixa no topo de todas as páginas do site.</>] : []),
      <>Os modelos de mensagem são usados ao confirmar, recusar ou cancelar um agendamento pelo WhatsApp.</>,
    ],
  };
}

export default async function ConfiguracoesPage({ searchParams }: { searchParams: { aba?: string } }) {
  const siteEnabled = isSiteEnabled();
  const tabs = getTabs(siteEnabled);
  const tab = tabs.some((t) => t.id === searchParams.aba) ? searchParams.aba! : "painel";

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Ajustes" title="Configurações" guide={getGuides(siteEnabled)[tab]} guideKey={`configuracoes-${tab}`} />

      <nav aria-label="Seções das configurações" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-1.5 rounded-2xl border border-brand-beige bg-white p-1.5 sm:w-auto sm:flex-wrap">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = id === tab;
            return (
              <li key={id}>
                <Link
                  href={`/admin/configuracoes?aba=${id}`}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                    active ? "bg-brand-forest text-brand-ink" : "text-brand-graphite/70 hover:bg-brand-cream hover:text-brand-graphite"
                  )}
                >
                  <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <TabContent tab={tab} siteEnabled={siteEnabled} />
    </div>
  );
}

async function TabContent({ tab, siteEnabled }: { tab: string; siteEnabled: boolean }) {
  if (tab === "aparelho") return <DevicePrefsForm />;
  if (tab === "financeiro") {
    const options = await getFinanceOptions();
    const usage = await getPayableCategoryUsage(options.categories.map((c) => c.slug));
    return (
      <div className="grid gap-6 xl:grid-cols-2">
        <PaymentMethodsForm methods={options.paymentMethods} />
        <PayableCategoriesForm categories={options.categories} usage={usage} />
      </div>
    );
  }
  if (tab === "salao") {
    const [settings, businessHours] = await Promise.all([getSettings(), getBusinessHours()]);
    return <SalonSettings settings={settings} businessHours={businessHours} />;
  }
  if (tab === "site") {
    return <SiteSettings settings={await getSettings()} siteEnabled={siteEnabled} />;
  }
  const preferences = await getPanelPreferences();
  return <PanelPreferencesForm preferences={preferences} />;
}
