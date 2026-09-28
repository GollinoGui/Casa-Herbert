"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input, FieldLabel } from "@/components/ui/Field";
import { ImageField } from "@/components/admin/MediaPicker";
import {
  createGalleryItemAction,
  deleteGalleryItemAction,
  updateGalleryItemImageAction,
} from "@/lib/actions/admin/gallery";
import { cn } from "@/lib/utils/cn";
import type { GalleryItem, Media } from "@/types";

export function GalleryManager({ items }: { items: GalleryItem[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("Remover este item da galeria?")) return;
    await deleteGalleryItemAction(id);
    router.refresh();
  }

  async function handleImageChange(id: string, media: Media | null) {
    await updateGalleryItemImageAction(id, media?.id ?? null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Novo item
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 ? (
          <p className="text-sm text-brand-graphite/60">Nenhum item na galeria.</p>
        ) : (
          items.map((item) => (
            <Card key={item.id} className={cn("p-3", !item.isPublished && "opacity-60")}>
              <ImageField
                label={item.caption || item.category}
                aspect="1/1"
                imageUrl={item.imageUrl}
                mediaId={item.mediaId}
                onChange={(media) => handleImageChange(item.id, media)}
              />
              <div className="mt-3">
                <p className="text-sm font-medium text-brand-graphite">{item.caption || "Sem legenda"}</p>
                <p className="text-xs text-brand-graphite/60">{item.category}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      item.isPublished ? "bg-brand-forest/10 text-brand-forest" : "bg-brand-graphite/10 text-brand-graphite/70"
                    )}
                  >
                    {item.isPublished ? "Publicado" : "Rascunho"}
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="-mr-1.5 rounded-lg p-2 text-brand-graphite/50 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remover"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <GalleryFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function GalleryFormModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("resultados");
  const [isPublished, setIsPublished] = useState(true);
  const [media, setMedia] = useState<Media | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await createGalleryItemAction({ caption, category, isPublished, mediaId: media?.id ?? null });
    setSaving(false);
    setCaption("");
    setCategory("resultados");
    setIsPublished(true);
    setMedia(null);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo item da galeria">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel>Foto</FieldLabel>
          <div className="max-w-xs">
            <ImageField
              label={caption || "Novo item"}
              aspect="1/1"
              imageUrl={media?.url ?? null}
              mediaId={media?.id ?? null}
              onChange={setMedia}
            />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="g-caption">Legenda</FieldLabel>
          <Input id="g-caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="g-category">Categoria</FieldLabel>
          <Input
            id="g-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ex.: resultados"
            required
          />
          <p className="mt-1.5 text-xs text-brand-graphite/50">
            A seção &quot;Resultados&quot; da página inicial mostra os itens da categoria &quot;resultados&quot;.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-brand-graphite">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="h-4 w-4 rounded border-brand-beige"
          />
          Publicado no site
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
