import type { Metadata } from "next";
import { getAllServices } from "@/lib/data/services";
import { ServicesManager } from "@/components/admin/ServicesManager";

export const metadata: Metadata = { title: "Serviços" };

export default async function ServicosPage() {
  const services = await getAllServices();
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Serviços</p>
        <h1 className="font-serif text-3xl text-brand-forest">Serviços oferecidos</h1>
      </div>
      <ServicesManager services={services} />
    </div>
  );
}
