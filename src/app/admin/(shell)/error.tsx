"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-brand-forest/10 bg-white p-8 text-center shadow-soft">
      <AlertTriangle className="h-9 w-9 text-brand-gold" aria-hidden="true" />
      <h1 className="mt-4 font-serif text-2xl text-brand-forest">Algo deu errado</h1>
      <p className="mt-2 max-w-sm text-sm text-brand-graphite/70">
        Não foi possível carregar esta seção do painel. Tente novamente — se o erro continuar,
        verifique os dados envolvidos.
      </p>
      <Button variant="primary" className="mt-6" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  );
}
