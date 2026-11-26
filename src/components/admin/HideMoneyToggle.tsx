"use client";

import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { updateDevicePrefs } from "@/lib/panel/device";

/** Esconde/mostra saldos e totais neste aparelho. O ícone segue o atributo do <html> (CSS), sem esperar a hidratação. */
export function HideMoneyToggle({ className, withLabel }: { className?: string; withLabel?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => updateDevicePrefs({ hideMoney: document.documentElement.dataset.valores !== "ocultos" })}
      aria-label="Esconder ou mostrar os valores em dinheiro"
      className={cn(
        "flex items-center gap-3 rounded-xl text-sm font-medium transition-colors active:scale-[0.97]",
        className
      )}
    >
      <span className="icone-valores-visiveis flex items-center gap-3">
        <EyeOff size={18} strokeWidth={1.75} aria-hidden="true" />
        {withLabel ? "Esconder valores" : null}
      </span>
      <span className="icone-valores-ocultos flex items-center gap-3">
        <Eye size={18} strokeWidth={1.75} aria-hidden="true" />
        {withLabel ? "Mostrar valores" : null}
      </span>
    </button>
  );
}
