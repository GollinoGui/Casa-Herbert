"use client";

import { cn } from "@/lib/utils/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

/** Linha inteira clicável com interruptor à direita — alvo de toque grande no celular. */
export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-brand-cream disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="min-w-0">
        <span className={cn("block text-sm font-medium", checked ? "text-brand-graphite" : "text-brand-graphite/60")}>{label}</span>
        {description ? <span className="block text-xs text-brand-graphite/50">{description}</span> : null}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-brand-forest" : "bg-brand-beige"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-snow shadow-sm transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  );
}
