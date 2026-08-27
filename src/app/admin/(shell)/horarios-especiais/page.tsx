import type { Metadata } from "next";
import { getSpecialHours } from "@/lib/data/special-hours";
import { SpecialHoursManager } from "@/components/admin/SpecialHoursManager";

export const metadata: Metadata = { title: "Horários Especiais" };

export default async function HorariosEspeciaisPage() {
  const items = await getSpecialHours();
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Horários especiais</p>
        <h1 className="font-serif text-3xl text-brand-forest">Datas com horário diferente</h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-graphite/70">
          Estas configurações substituem o horário semanal padrão apenas na data selecionada — úteis para
          feriados, vésperas ou dias com expediente reduzido.
        </p>
      </div>
      <SpecialHoursManager items={items} />
    </div>
  );
}
