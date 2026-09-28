import type { Metadata } from "next";
import { getSlotAssignments, listMedia } from "@/lib/data/media";
import { SiteImagesManager } from "@/components/admin/SiteImagesManager";

export const metadata: Metadata = { title: "Fotos do site" };

export default async function FotosPage() {
  const [assignments, media] = await Promise.all([getSlotAssignments(), listMedia()]);
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Fotos</p>
        <h1 className="font-serif text-2xl text-brand-forest sm:text-3xl">Fotos do site</h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-graphite/70">
          Escolha a foto de cada espaço do site. As fotos dos cards de serviço (carrossel da página inicial) ficam em
          Serviços, e as da seção de resultados, em Galeria.
        </p>
      </div>
      <SiteImagesManager assignments={assignments} media={media} />
    </div>
  );
}
