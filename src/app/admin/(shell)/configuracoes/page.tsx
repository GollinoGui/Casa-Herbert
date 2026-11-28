import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Globe, MessageSquareText, Smartphone, Store, Users, Wallet, type LucideIcon } from "lucide-react";
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
import { getPanelUser } from "@/lib/auth/require-admin";
import { STAFF_SETTINGS_TABS, type PanelRole } from "@/lib/auth/permissions";
import { listAllProfessionals, listPanelUsers } from "@/lib/data/team";
import { PanelAccessManager, ProfessionalsForm } from "@/components/admin/TeamSettings";

export const metadata: Metadata = { title: "Configurações" };

function getTabs(siteEnabled: boolean, role: PanelRole): { id: string; label: string; icon: LucideIcon }[] {
  const tabs = [
    { id: "painel", label: "Painel e gráficos", icon: BarChart3 },
    { id: "aparelho", label: "Este aparelho", icon: Smartphone },
    { id: "equipe", label: "Equipe e acessos", icon: Users },
    { id: "financeiro", label: "Financeiro", icon: Wallet },
    { id: "salao", label: "Salão e agenda", icon: Store },
    siteEnabled
      ? { id: "site", label: "Site e mensagens", icon: Globe }
      : { id: "site", label: "Mensagens", icon: MessageSquareText },
  ];
  // A aba que a página abre é escolhida desta lista: aba de fora nem chega a consultar os dados.
  return role === "admin" ? tabs : tabs.filter((t) => (STAFF_SETTINGS_TABS as readonly string[]).includes(t.id));
}

function getGuides(siteEnabled: boolean): Record<string, React.ReactNode[]> {
  return {
    painel: [
      <>Ligue ou desligue cada cartão e gráfico do <strong>Início</strong> e dos <strong>Relatórios</strong>, e use as setas para mudar a ordem do Início.</>,
      <>Aqui também ficam os prazos dos avisos, as linhas da agenda e a forma de pagamento que já vem marcada.</>,
      <>Esconder não apaga nada: os números continuam sendo calculados e voltam quando você liga de novo.</>,
      <>Clique em <strong>Salvar preferências</strong>. “Mostrar tudo de novo” volta ao padrão.</>,
    ],
    equipe: [
      <>Em <strong>Profissionais</strong> ficam quem atende e vende: eles aparecem na agenda, na venda e nas comissões.</>,
      <>
        Em <strong>Acessos ao painel</strong>, crie um login para cada pessoa. A <strong>secretária</strong> marca, confirma, remarca
        e cancela horários e cuida de clientes e lista de espera, mas não vê saldo, vendas, valores recebidos, estoque nem relatórios.
      </>,
      <>Mudar o nível ou remover alguém vale na hora. Sempre fica pelo menos um administrador.</>,
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
  const user = await getPanelUser();
  const tabs = getTabs(siteEnabled, user?.role ?? "staff");
  const tab = tabs.some((t) => t.id === searchParams.aba) ? searchParams.aba! : tabs[0].id;

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

      <TabContent tab={tab} siteEnabled={siteEnabled} currentUserId={user?.id ?? ""} />
    </div>
  );
}

async function TabContent({ tab, siteEnabled, currentUserId }: { tab: string; siteEnabled: boolean; currentUserId: string }) {
  if (tab === "aparelho") return <DevicePrefsForm />;
  if (tab === "equipe") {
    const [users, professionals] = await Promise.all([listPanelUsers(), listAllProfessionals()]);
    return (
      <div className="grid gap-6 xl:grid-cols-2">
        <PanelAccessManager users={users} currentUserId={currentUserId} />
        <ProfessionalsForm professionals={professionals} />
      </div>
    );
  }
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
