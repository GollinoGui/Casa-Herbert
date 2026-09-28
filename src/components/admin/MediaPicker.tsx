"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ImagePlus, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { listMediaAction, uploadMediaAction } from "@/lib/actions/admin/media";
import { prepareImageForUpload } from "@/lib/utils/image-resize";
import { cn } from "@/lib/utils/cn";
import type { ImagePosition, Media } from "@/types";

export const POSITION_LABELS: Record<ImagePosition, string> = {
  center: "Centro",
  top: "Topo",
  bottom: "Base",
};

/** Reduz no navegador e envia. Devolve as fotos criadas; erros ficam em `error`. */
export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (files: FileList | File[]): Promise<Media[]> => {
    setUploading(true);
    setError(null);
    const created: Media[] = [];
    try {
      for (const file of Array.from(files)) {
        const prepared = await prepareImageForUpload(file);
        const formData = new FormData();
        const extension = prepared.blob.type === "image/webp" ? "webp" : "jpg";
        formData.append("file", prepared.blob, `foto.${extension}`);
        formData.append("alt", file.name.replace(/\.[^.]+$/, ""));
        formData.append("width", String(prepared.width));
        formData.append("height", String(prepared.height));
        const result = await uploadMediaAction(formData);
        if (!result.ok) {
          setError(result.error);
          break;
        }
        created.push(result.media);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar a foto.");
    } finally {
      setUploading(false);
    }
    return created;
  }, []);

  return { upload, uploading, error };
}

export function UploadButton({
  onUploaded,
  multiple = false,
  label = "Enviar foto",
}: {
  onUploaded: (media: Media[]) => void;
  multiple?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, error } = useMediaUpload();

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={async (e) => {
          const files = e.target.files;
          if (!files?.length) return;
          const created = await upload(files);
          e.target.value = "";
          if (created.length) onUploaded(created);
        }}
      />
      <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <ImagePlus size={16} aria-hidden="true" />
        )}
        {uploading ? "Enviando…" : label}
      </Button>
      <p className="mt-1.5 text-xs text-red-600 empty:hidden" aria-live="polite">
        {error}
      </p>
    </div>
  );
}

interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: Media) => void;
  selectedId?: string | null;
  title?: string;
}

/**
 * Biblioteca de fotos + upload. Renderizado num portal: pode abrir de dentro de outro
 * Modal (ex.: edição de serviço), cujo painel animado com transform prenderia o
 * `position: fixed` deste.
 */
export function MediaPickerModal({ open, onClose, onSelect, selectedId, title = "Escolher foto" }: MediaPickerModalProps) {
  const [media, setMedia] = useState<Media[] | null>(null);

  useEffect(() => {
    if (!open) return;
    listMediaAction().then(setMedia);
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <Modal open={open} onClose={onClose} title={title} widthClassName="max-w-3xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-brand-graphite/60">Toque numa foto da biblioteca ou envie uma nova.</p>
          <UploadButton
            label="Enviar nova foto"
            onUploaded={(created) => {
              onSelect(created[0]);
            }}
          />
        </div>

        {media === null ? (
          <p className="py-10 text-center text-sm text-brand-graphite/50">Carregando fotos…</p>
        ) : media.length === 0 ? (
          <p className="py-10 text-center text-sm text-brand-graphite/50">Nenhuma foto na biblioteca ainda.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {media.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onSelect(m)}
                  className={cn(
                    "group relative block aspect-square w-full overflow-hidden rounded-xl ring-2 transition-shadow focus-visible:outline-none focus-visible:ring-brand-moss",
                    m.id === selectedId ? "ring-brand-forest" : "ring-transparent hover:ring-brand-sage"
                  )}
                  aria-label={`Escolher ${m.alt ?? "foto"}`}
                >
                  <Image src={m.url} alt={m.alt ?? ""} fill sizes="200px" className="object-cover" />
                  {m.id === selectedId ? (
                    <span className="absolute right-2 top-2 rounded-full bg-brand-forest p-1 text-white">
                      <Check size={14} aria-hidden="true" />
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>,
    document.body
  );
}

const ASPECT_CLASS = {
  "16/9": "aspect-[16/9]",
  "4/3": "aspect-[4/3]",
  "4/5": "aspect-[4/5]",
  "1/1": "aspect-square",
} as const;

export type PreviewAspect = keyof typeof ASPECT_CLASS;

interface ImageFieldProps {
  imageUrl: string | null;
  mediaId: string | null;
  position?: ImagePosition | null;
  aspect?: PreviewAspect;
  label?: string;
  onChange: (media: Media | null) => void;
  /** Sem isso, o seletor de recorte não aparece. */
  onPositionChange?: (position: ImagePosition) => void;
  disabled?: boolean;
}

/** Preview da foto escolhida + trocar / remover / recorte. */
export function ImageField({
  imageUrl,
  mediaId,
  position,
  aspect = "4/3",
  label,
  onChange,
  onPositionChange,
  disabled,
}: ImageFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="space-y-2">
      {imageUrl ? (
        <div className={cn("relative w-full overflow-hidden rounded-xl bg-brand-cream", ASPECT_CLASS[aspect])}>
          <Image
            src={imageUrl}
            alt={label ?? ""}
            fill
            sizes="400px"
            className="object-cover"
            style={{ objectPosition: position ?? "center" }}
          />
        </div>
      ) : (
        <PlaceholderImage label="Sem foto" className={cn("w-full rounded-xl", ASPECT_CLASS[aspect])} />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className="!px-3 !py-1.5 text-xs"
          onClick={() => setPickerOpen(true)}
          disabled={disabled}
        >
          {imageUrl ? "Trocar foto" : "Escolher foto"}
        </Button>
        {imageUrl ? (
          <Button
            type="button"
            variant="ghost"
            className="!px-3 !py-1.5 text-xs"
            onClick={() => onChange(null)}
            disabled={disabled}
          >
            Remover
          </Button>
        ) : null}
        {imageUrl && onPositionChange ? (
          <Select
            aria-label="Recorte da foto"
            className="!w-auto !py-1.5 text-xs sm:!text-xs"
            value={position ?? "center"}
            onChange={(e) => onPositionChange(e.target.value as ImagePosition)}
            disabled={disabled}
          >
            {(Object.keys(POSITION_LABELS) as ImagePosition[]).map((p) => (
              <option key={p} value={p}>
                Recorte: {POSITION_LABELS[p]}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedId={mediaId}
        title={label ? `Foto — ${label}` : undefined}
        onSelect={(media) => {
          setPickerOpen(false);
          onChange(media);
        }}
      />
    </div>
  );
}
