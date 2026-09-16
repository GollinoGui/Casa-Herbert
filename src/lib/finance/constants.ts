import type { PaymentMethod } from "@/types";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  outro: "Outro",
};

export const PAYMENT_METHODS: PaymentMethod[] = ["dinheiro", "pix", "cartao_credito", "cartao_debito", "outro"];
