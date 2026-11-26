"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/Field";

interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  /** Centavos; null = vazio. */
  value: number | null;
  onChange: (cents: number | null) => void;
  /** Sem isso, apagar tudo vira 0 em vez de vazio. */
  allowEmpty?: boolean;
}

function display(cents: number | null) {
  if (cents == null) return "";
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Campo de dinheiro estilo maquininha: os dígitos entram pela direita
 * ("1" → 0,01; "15000" → 150,00). Evita digitar centavos à mão.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onChange, allowEmpty = false, className, placeholder = "0,00", ...props },
  ref
) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-brand-graphite/50">R$</span>
      <Input
        ref={ref}
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        className={`pl-10 tabular-nums ${className ?? ""}`}
        value={display(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").replace(/^0+/, "");
          if (!digits) {
            onChange(allowEmpty ? null : 0);
            return;
          }
          onChange(Math.min(Number(digits), 99_999_999));
        }}
      />
    </div>
  );
});
