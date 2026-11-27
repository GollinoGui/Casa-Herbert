"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Evento para abrir a busca de qualquer botão (barra do topo, celular). */
export const OPEN_SEARCH_EVENT = "painel:abrir-busca";

/** Botão que abre a busca (o atalho de teclado funciona sem ele). */
export function SearchButton({ className, withHint }: { className?: string; withHint?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
      aria-label="Buscar (Ctrl+K)"
      title="Buscar (Ctrl+K)"
      className={cn("inline-flex items-center gap-2 transition", className)}
    >
      <Search size={17} strokeWidth={1.8} aria-hidden="true" />
      {withHint ? (
        <>
          <span className="text-sm">Buscar</span>
          <kbd className="rounded-md border border-brand-beige px-1.5 py-0.5 text-[10px] text-brand-graphite/50">Ctrl K</kbd>
        </>
      ) : null}
    </button>
  );
}
