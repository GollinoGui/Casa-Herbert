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
        <h1 className="font-serif text-3xl text-brand-forest">Galeria de fotos</h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-graphite/70">
          Upload de imagens reais será adicionado quando o Supabase Storage for conectado. Por enquanto, cada item
          usa uma imagem ilustrativa.
        </p>
      </div>
      <GalleryManager items={items} />
    </div>
  );
}
