"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { toggleTheme } from "@/lib/panel/theme";

/** Botão de tema do painel. Os ícones e o rótulo trocam pelo atributo do <html> (CSS). */
export function ThemeToggle({ className, withLabel }: { className?: string; withLabel?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => toggleTheme(e)}
      aria-label="Alternar entre tema claro e escuro"
      className={cn(
        "flex items-center gap-3 rounded-xl text-sm font-medium transition-colors active:scale-[0.97]",
        className
      )}
    >
      <span className="tema-icone-claro flex items-center gap-3">
        <Moon size={18} strokeWidth={1.75} aria-hidden="true" />
        {withLabel ? "Tema escuro" : null}
      </span>
      <span className="tema-icone-escuro flex items-center gap-3">
        <Sun size={18} strokeWidth={1.75} aria-hidden="true" />
        {withLabel ? "Tema claro" : null}
      </span>
    </button>
  );
}
