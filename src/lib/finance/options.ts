import { z } from "zod";
import type { PaymentMethod } from "@/types";
import { PAYABLE_CATEGORIES, PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/lib/finance/constants";

/**
 * Formas de pagamento e categorias de conta editáveis em Configurações.
 *
 * Desativar não apaga nada: o mapa de rótulos guarda todas (inclusive as
 * desativadas), porque vendas, contas e relatórios antigos continuam mostrando
 * o nome. Só os seletores de lançamento novo filtram pelas ativas.
 */

export interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
  enabled: boolean;
}

export interface PayableCategoryOption {
  slug: string;
  label: string;
  active: boolean;
}

export interface FinanceOptions {
  paymentMethods: PaymentMethodOption[];
  categories: PayableCategoryOption[];
  /** Escolhida em Configurações; só vale se estiver ligada (ver pickMethod). */
  defaultMethod: PaymentMethod;
}

export const DEFAULT_FINANCE_OPTIONS: FinanceOptions = {
  paymentMethods: PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m], enabled: true })),
  categories: PAYABLE_CATEGORIES.map((c) => ({ slug: c.value, label: c.label, active: true })),
  defaultMethod: "pix",
};

const storedMethod = z
  .object({ label: z.string().trim().min(1).max(30).optional().catch(undefined), enabled: z.boolean().optional().catch(undefined) })
  .catch({});

/** settings.payment_method_options → lista completa, na ordem do enum, com padrões por cima. Nunca lança. */
export function parsePaymentMethodOptions(raw: unknown): PaymentMethodOption[] {
  const stored = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const list = PAYMENT_METHODS.map((m) => {
    const s = storedMethod.parse(stored[m] ?? {});
    return { value: m, label: s.label ?? PAYMENT_METHOD_LABELS[m], enabled: s.enabled ?? true };
  });
  // Dado salvo à mão com tudo desligado deixaria os seletores vazios.
  return list.some((m) => m.enabled) ? list : list.map((m) => ({ ...m, enabled: true }));
}

export const paymentMethodsInputSchema = z
  .array(
    z.object({
      value: z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]]),
      label: z.string().trim().min(1, "Dê um nome para cada forma de pagamento.").max(30, "Nome de até 30 letras."),
      enabled: z.boolean(),
    })
  )
  .refine((list) => list.some((m) => m.enabled), "Deixe pelo menos uma forma de pagamento ligada.")
  .refine((list) => new Set(list.map((m) => m.value)).size === list.length, "Forma de pagamento repetida.");

export const payableCategoriesInputSchema = z
  .array(
    z.object({
      /** Vazio = categoria nova; o servidor cria o slug a partir do nome. */
      slug: z.string().regex(/^([a-z0-9_]{1,40})?$/),
      label: z.string().trim().min(1, "Dê um nome para cada categoria.").max(60, "Nome de até 60 letras."),
      active: z.boolean(),
    })
  )
  .min(1, "Deixe pelo menos uma categoria.")
  .refine((list) => list.some((c) => c.active), "Deixe pelo menos uma categoria ativa.")
  .refine(
    (list) => new Set(list.map((c) => c.label.trim().toLocaleLowerCase("pt-BR"))).size === list.length,
    "Há duas categorias com o mesmo nome."
  );

/** "Luz / energia" → "luz_energia". */
export function slugifyCategory(label: string): string {
  const base = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 34);
  return base || "categoria";
}
