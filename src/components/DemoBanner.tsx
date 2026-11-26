import { isDemoMode } from "@/lib/demo/mode";

/** Faixa fixa em todas as páginas enquanto o app roda sem banco (src/lib/demo). */
export function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div role="status" className="relative z-50 bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900">
      Modo demonstração — dados de exemplo, sem banco. O que você mudar some ao reiniciar o servidor.
    </div>
  );
}
