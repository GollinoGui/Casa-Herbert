import type { PaymentMethod } from "@/types";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  outro: "Outro",
};

export const PAYMENT_METHODS: PaymentMethod[] = ["dinheiro", "pix", "cartao_credito", "cartao_debito", "outro"];

export const PAYABLE_CATEGORIES: { value: string; label: string }[] = [
  { value: "agua", label: "Água" },
  { value: "energia", label: "Luz / energia" },
  { value: "aluguel", label: "Aluguel" },
  { value: "internet", label: "Internet / telefone" },
  { value: "impostos", label: "Impostos e taxas" },
  { value: "compra", label: "Compra de mercadoria" },
  { value: "fornecedor", label: "Fornecedor / material" },
  { value: "maquininha", label: "Taxa de maquininha" },
  { value: "pessoal", label: "Pessoal / pró-labore" },
  { value: "manutencao", label: "Manutenção" },
  { value: "outros", label: "Outros" },
];

export function payableCategoryLabel(value: string) {
  return PAYABLE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
