"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PaymentMethod } from "@/types";
import { DEFAULT_FINANCE_OPTIONS, type FinanceOptions, type PaymentMethodOption } from "@/lib/finance/options";

/**
 * Formas de pagamento e categorias de conta configuradas pelo Herbert. Vem do
 * layout do painel (servidor) e chega aos modais de venda/pagamento, que ficam
 * vários níveis abaixo (ex.: SaleModal dentro de AppointmentDetailModal).
 */
const FinanceOptionsContext = createContext<FinanceOptions>(DEFAULT_FINANCE_OPTIONS);

export function FinanceOptionsProvider({ value, children }: { value: FinanceOptions; children: ReactNode }) {
  // Cada router.refresh() entrega um objeto novo com o mesmo conteúdo; sem isto,
  // os efeitos dos modais que dependem das opções resetariam o formulário aberto.
  const serialized = JSON.stringify(value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stable = useMemo(() => value, [serialized]);
  return <FinanceOptionsContext.Provider value={stable}>{children}</FinanceOptionsContext.Provider>;
}

export function useFinanceOptions() {
  const options = useContext(FinanceOptionsContext);
  return useMemo(() => {
    const methodLabels = new Map(options.paymentMethods.map((m) => [m.value, m.label]));
    const categoryLabels = new Map(options.categories.map((c) => [c.slug, c.label]));
    return {
      /** Rótulo para exibir qualquer registro, inclusive de forma desligada. */
      methodLabel: (m: PaymentMethod | string) => methodLabels.get(m as PaymentMethod) ?? m,
      /** Formas para um lançamento novo. Inclui `current` para não sumir a já escolhida. */
      methodChoices: (current?: PaymentMethod | null): PaymentMethodOption[] =>
        options.paymentMethods.filter((m) => m.enabled || m.value === current),
      categoryLabel: (slug: string) => categoryLabels.get(slug) ?? slug,
      /** Categorias ativas, mais a atual da conta se ela foi desativada (ou nem existe mais). */
      categoryChoices: (current?: string | null) => {
        const list = options.categories.filter((c) => c.active || c.slug === current);
        if (current && !list.some((c) => c.slug === current)) list.push({ slug: current, label: current, active: false });
        return list;
      },
      /** `preferred` (ou a padrão das Configurações) se estiver ligada; senão a primeira ligada. */
      pickMethod: (preferred: PaymentMethod = options.defaultMethod): PaymentMethod =>
        options.paymentMethods.find((m) => m.value === preferred && m.enabled)?.value ??
        (options.paymentMethods.find((m) => m.enabled) ?? options.paymentMethods[0]).value,
      pickCategory: (preferred: string): string =>
        options.categories.find((c) => c.slug === preferred && c.active)?.slug ??
        options.categories.find((c) => c.active)?.slug ??
        preferred,
    };
  }, [options]);
}
