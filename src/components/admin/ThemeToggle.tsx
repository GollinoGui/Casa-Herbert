"use client";

import { cn } from "@/lib/utils/cn";
import { toggleTheme } from "@/lib/panel/theme";

/**
 * Botão de tema do painel: verde → laranja e creme → escuro → verde. Mostra a
 * amostra do tema para o qual vai trocar; ícone e rótulo seguem o atributo do <html> (CSS).
 * As cores da amostra são fixas de propósito: é a prévia da outra paleta.
 */
export function ThemeToggle({ className, withLabel }: { className?: string; withLabel?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => toggleTheme(e)}
      aria-label="Trocar o tema do painel (verde, laranja e creme ou escuro)"
      title="Trocar o tema"
      className={cn(
        "flex items-center gap-3 rounded-xl text-sm font-medium transition-colors active:scale-[0.97]",
        className
      )}
    >
      <span className="tema-proximo-laranja flex items-center gap-3">
        <Swatch from="#A04A16" to="#EF8523" ring="#F9F2E5" />
        {withLabel ? "Tema laranja" : null}
      </span>
      <span className="tema-proximo-escuro flex items-center gap-3">
        <Swatch from="#0D1812" to="#F1923A" ring="#5C8065" />
        {withLabel ? "Tema escuro" : null}
      </span>
      <span className="tema-proximo-verde flex items-center gap-3">
        <Swatch from="#1D3A2A" to="#86C678" ring="#F2F1E6" />
        {withLabel ? "Tema verde" : null}
      </span>
    </button>
  );
}

function Swatch({ from, to, ring }: { from: string; to: string; ring: string }) {
  return (
    <span
      aria-hidden="true"
      className="block h-[18px] w-[18px] shrink-0 rounded-full"
      style={{ background: `linear-gradient(135deg, ${from} 0 50%, ${to} 50% 100%)`, boxShadow: `0 0 0 1.5px ${ring}` }}
    />
  );
}
