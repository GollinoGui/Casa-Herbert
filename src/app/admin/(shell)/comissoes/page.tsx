import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { CommissionsOverview } from "@/components/admin/CommissionsOverview";
import { CommissionSettings } from "@/components/admin/CommissionSettings";
import { getCommissionOverview, listAllProfessionals, listBrands, listCommissionRules } from "@/lib/data/commissions";
import { getAllServices } from "@/lib/data/services";
import { getAllProducts } from "@/lib/data/products";
import { monthRange, parseListFilters } from "@/lib/utils/list-filters";
import { todayDateStr } from "@/lib/utils/date-format";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Comissões" };

const TABS = [
  { value: "resumo", label: "A pagar", href: "/admin/comissoes" },
  { value: "regras", label: "Percentuais e marcas", href: "/admin/comissoes?aba=regras" },
] as const;

export default async function ComissoesPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const tab = searchParams.aba === "regras" ? "regras" : "resumo";

  const tabs = (
    <nav className="inline-flex rounded-xl bg-brand-cream/70 p-1" aria-label="Comissões">
      {TABS.map((t) => (
        <Link
          key={t.value}
          href={t.href}
          aria-current={tab === t.value ? "page" : undefined}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium transition",
            tab === t.value ? "bg-white text-brand-forest shadow-softer" : "text-brand-graphite/70 hover:text-brand-graphite"
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );

  if (tab === "regras") {
    const [professionals, brands, rules, services, products] = await Promise.all([
      listAllProfessionals(),
      listBrands(),
      listCommissionRules(),
      getAllServices(),
      getAllProducts(),
    ]);
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Financeiro"
          title="Percentuais e marcas"
          guideKey="comissoes-regras"
          guide={[
            <>Cadastre quem atende e vende em <strong>Profissionais</strong>.</>,
            <>
              Em <strong>Marcas</strong>, marque como consignada a marca cujo produto é dela: o salão recebe a venda e repassa o
              valor menos a comissão que fica com o Herbert.
            </>,
            <>
              Em <strong>Percentuais</strong>, escolha para quem vale (todos ou um profissional) e preencha só o que precisar. O
              mais específico vence: o produto ou serviço, depois a marca, depois o padrão.
            </>,
            <>Mudar um percentual vale para as próximas vendas. As vendas já feitas guardam o valor da época.</>,
          ]}
        />
        {tabs}
        <CommissionSettings
          professionals={professionals}
          brands={brands}
          rules={rules}
          services={services.map((s) => ({ id: s.id, name: s.name }))}
          products={products.map((p) => ({ id: p.id, name: p.name }))}
        />
      </div>
    );
  }

  const defaults = monthRange(todayDateStr());
  const filters = parseListFilters(searchParams, defaults);
  const targets = await getCommissionOverview(filters.dateFrom || "2000-01-01", filters.dateTo || todayDateStr());

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title="Comissões e repasses"
        guideKey="comissoes"
        guide={[
          <>A comissão só conta quando o dinheiro entra: venda em aberto ou paga em parte gera comissão aos poucos.</>,
          <>
            <strong>Devido hoje</strong> é tudo o que já entrou menos tudo o que já foi pago. Clique em <strong>Pagar</strong> e
            a saída vai para o Saldo e extrato.
          </>,
          <>Venda cancelada depois do pagamento deixa o saldo negativo, que é descontado no próximo pagamento.</>,
          <>Nas marcas consignadas, o repasse é o que o salão deve à marca. O que fica no salão é a comissão do Herbert.</>,
          <>Pacote gera comissão por sessão realizada, para quem atendeu.</>,
        ]}
      />
      {tabs}
      <CommissionsOverview targets={targets} defaults={defaults} />
    </div>
  );
}
