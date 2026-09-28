import type { Metadata } from "next";
import { getSlotAssignments, listMedia } from "@/lib/data/media";
import { getAllServices } from "@/lib/data/services";
import { getAllGallery } from "@/lib/data/gallery";
import { LIBRARY_TAB, SITE_IMAGE_PAGES, SITE_IMAGE_SLOTS } from "@/lib/site-images/slots";
import { SiteImagesManager } from "@/components/admin/SiteImagesManager";

export const metadata: Metadata = { title: "Fotos do site" };

export default async function FotosPage({ searchParams }: { searchParams: { aba?: string } }) {
  const [assignments, media, services, gallery] = await Promise.all([
    getSlotAssignments(),
    listMedia(),
    getAllServices(),
    getAllGallery(),
  ]);

  // Onde cada foto da biblioteca aparece — para ninguém apagar uma foto em uso sem saber.
  const usage: Record<string, string[]> = {};
  const addUsage = (mediaId: string | null, label: string) => {
    if (mediaId) (usage[mediaId] ??= []).push(label);
  };
  const slotByKey = new Map(SITE_IMAGE_SLOTS.map((s) => [s.key, s]));
  for (const a of assignments) {
    const slot = slotByKey.get(a.slotKey);
    if (slot) addUsage(a.mediaId, `${slot.page} · ${slot.label}`);
  }
  for (const s of services) addUsage(s.imageId, `Serviço · ${s.name}`);
  for (const g of gallery) addUsage(g.mediaId, `Galeria · ${g.caption || g.category}`);

  const validTabs = [...SITE_IMAGE_PAGES.map((p) => p.id), LIBRARY_TAB];
  const activeTab = searchParams.aba && validTabs.includes(searchParams.aba) ? searchParams.aba : SITE_IMAGE_PAGES[0].id;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Fotos</p>
        <h1 className="font-serif text-2xl text-brand-forest sm:text-3xl">Fotos do site</h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-graphite/70">
          Escolha a página e troque a foto de cada espaço. A mudança aparece no site na hora.
        </p>
      </div>
      <SiteImagesManager assignments={assignments} media={media} usage={usage} activeTab={activeTab} />
    </div>
  );
}
