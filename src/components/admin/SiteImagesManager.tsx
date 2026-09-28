"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ImageField, UploadButton } from "@/components/admin/MediaPicker";
import { clearSlotImageAction, deleteMediaAction, setSlotImageAction } from "@/lib/actions/admin/media";
import { SITE_IMAGE_SLOT_GROUPS } from "@/lib/site-images/slots";
import type { Media, SiteImageSlotAssignment } from "@/types";

interface SiteImagesManagerProps {
  assignments: SiteImageSlotAssignment[];
  media: Media[];
}

export function SiteImagesManager({ assignments, media }: SiteImagesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [savingSlot, setSavingSlot] = useState<string | null>(null);
  const bySlot = new Map(assignments.map((a) => [a.slotKey, a]));

  function run(slotKey: string, action: () => Promise<void>) {
    setSavingSlot(slotKey);
    startTransition(async () => {
      await action();
      router.refresh();
      setSavingSlot(null);
    });
  }

  async function handleDelete(item: Media) {
    const message = item.storagePath
      ? "Apagar esta foto? Os lugares do site que a usam voltam para a imagem ilustrativa."
      : "Tirar esta foto da biblioteca? Os lugares do site que a usam voltam para a imagem ilustrativa.";
    if (!confirm(message)) return;
    await deleteMediaAction(item.id);
    router.refresh();
  }

  return (
    <div className="space-y-10">
      {SITE_IMAGE_SLOT_GROUPS.map((group) => (
        <section key={group.page} className="space-y-3">
          <h2 className="font-serif text-lg text-brand-forest">{group.page}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.slots.map((slot) => {
              const current = bySlot.get(slot.key);
              return (
                <Card key={slot.key} className="p-4">
                  <p className="mb-3 text-sm font-medium text-brand-graphite">{slot.label}</p>
                  <ImageField
                    label={slot.label}
                    aspect={slot.aspect}
                    imageUrl={current?.url ?? null}
                    mediaId={current?.mediaId ?? null}
                    position={current?.position ?? null}
                    disabled={isPending && savingSlot === slot.key}
                    onChange={(picked) =>
                      run(slot.key, () =>
                        picked
                          ? setSlotImageAction(slot.key, picked.id, current?.position ?? null)
                          : clearSlotImageAction(slot.key)
                      )
                    }
                    onPositionChange={(position) =>
                      current && run(slot.key, () => setSlotImageAction(slot.key, current.mediaId, position))
                    }
                  />
                </Card>
              );
            })}
          </div>
        </section>
      ))}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg text-brand-forest">Biblioteca</h2>
            <p className="text-sm text-brand-graphite/60">Todas as fotos enviadas. Dá para enviar várias de uma vez.</p>
          </div>
          <UploadButton multiple label="Enviar fotos" onUploaded={() => router.refresh()} />
        </div>
        {media.length === 0 ? (
          <p className="text-sm text-brand-graphite/60">Nenhuma foto enviada ainda.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {media.map((item) => (
              <li key={item.id} className="group relative aspect-square overflow-hidden rounded-xl bg-brand-cream">
                <Image src={item.url} alt={item.alt ?? ""} fill sizes="200px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="absolute right-1.5 top-1.5 rounded-lg bg-white/90 p-1.5 text-brand-graphite/70 shadow-softer transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Apagar foto"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
