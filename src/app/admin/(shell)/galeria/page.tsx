import type { Metadata } from "next";
import { getAllGallery } from "@/lib/data/gallery";
import { GalleryManager } from "@/components/admin/GalleryManager";

export const metadata: Metadata = { title: "Galeria" };

export default async function GaleriaPage() {
  const items = await getAllGallery();
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Galeria</p>
        <h1 className="font-serif text-2xl text-brand-forest sm:text-3xl">Galeria de fotos</h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-graphite/70">
          Fotos da seção &quot;Resultados&quot; da página inicial. Item sem foto aparece com uma imagem ilustrativa.
        </p>
      </div>
      <GalleryManager items={items} />
    </div>
  );
}
