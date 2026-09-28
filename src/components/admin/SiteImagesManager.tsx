"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Camera, ImageIcon, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { MediaPickerModal, POSITION_LABELS, UploadButton } from "@/components/admin/MediaPicker";
import { clearSlotImageAction, deleteMediaAction, setSlotImageAction } from "@/lib/actions/admin/media";
import {
  ASPECT_LABELS,
  LIBRARY_TAB,
  SITE_IMAGE_PAGES,
  type SiteImagePage,
  type SiteImageSlot,
} from "@/lib/site-images/slots";
import { cn } from "@/lib/utils/cn";
import type { ImagePosition, Media, SiteImageSlotAssignment } from "@/types";

interface SiteImagesManagerProps {
  assignments: SiteImageSlotAssignment[];
  media: Media[];
  /** mediaId → onde a foto aparece ("Início · Foto principal", "Serviço · Velaterapia"…). */
  usage: Record<string, string[]>;
  activeTab: string;
}

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest/50 focus-visible:ring-offset-2";

export function SiteImagesManager({ assignments, media, usage, activeTab }: SiteImagesManagerProps) {
  const bySlot = new Map(assignments.map((a) => [a.slotKey, a]));
  const activePage = SITE_IMAGE_PAGES.find((p) => p.id === activeTab) ?? null;

  return (
    <div className="space-y-6">
      <nav aria-label="Páginas do site" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {SITE_IMAGE_PAGES.map((page) => {
            const slots = page.sections.flatMap((s) => s.slots);
            const filled = slots.filter((s) => bySlot.has(s.key)).length;
            return (
              <li key={page.id}>
                <TabLink href={`?aba=${page.id}`} active={page.id === activeTab}>
                  {page.page}
                  <span className="tabular-nums opacity-70">
                    {filled}/{slots.length}
                  </span>
                </TabLink>
              </li>
            );
          })}
          <li>
            <TabLink href={`?aba=${LIBRARY_TAB}`} active={activeTab === LIBRARY_TAB}>
              <ImageIcon size={15} aria-hidden="true" />
              Biblioteca
              <span className="tabular-nums opacity-70">{media.length}</span>
            </TabLink>
          </li>
        </ul>
      </nav>

      {activePage ? (
        <PagePanel page={activePage} bySlot={bySlot} />
      ) : (
        <LibraryPanel media={media} usage={usage} />
      )}
    </div>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        focusRing,
        active
          ? "border-brand-forest bg-brand-forest text-brand-cream"
          : "border-brand-beige bg-white text-brand-graphite hover:border-brand-moss hover:bg-brand-cream"
      )}
    >
      {children}
    </Link>
  );
}

function PagePanel({ page, bySlot }: { page: SiteImagePage; bySlot: Map<string, SiteImageSlotAssignment> }) {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-beige pb-4">
        <h2 className="font-serif text-xl text-brand-forest">Página {page.page}</h2>
        <a
          href={page.path}
          target="_blank"
          rel="noreferrer"
          className={cn("inline-flex items-center gap-1 rounded text-sm font-medium text-brand-moss hover:underline", focusRing)}
        >
          Ver página no site <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </div>

      {page.sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-graphite/60">{section.title}</h3>
          <ul className="grid gap-3 lg:grid-cols-2">
            {section.slots.map((slot) => (
              <SlotRow key={slot.key} slot={slot} current={bySlot.get(slot.key) ?? null} />
            ))}
          </ul>
        </section>
      ))}

      {page.elsewhere?.length ? (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-graphite/60">
            Outras fotos desta página
          </h3>
          <ul className="grid gap-3 lg:grid-cols-2">
            {page.elsewhere.map((item) => (
              <li
                key={item.href}
                className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-brand-beige bg-brand-cream/40 px-4 py-3"
              >
                <span className="min-w-0 text-sm text-brand-graphite">{item.label}</span>
                <Link
                  href={item.href}
                  className={cn("shrink-0 rounded text-sm font-medium text-brand-moss hover:underline", focusRing)}
                >
                  {item.linkLabel} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SlotRow({ slot, current }: { slot: SiteImageSlot; current: SiteImageSlotAssignment | null }) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  function handlePick(picked: Media) {
    setPickerOpen(false);
    run(() => setSlotImageAction(slot.key, picked.id, current?.position ?? null));
  }

  function handlePosition(position: ImagePosition) {
    if (current) run(() => setSlotImageAction(slot.key, current.mediaId, position));
  }

  return (
    <li className="flex gap-4 rounded-2xl border border-brand-beige bg-white p-3">
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        disabled={isPending}
        aria-label={current ? `Trocar foto: ${slot.label}` : `Escolher foto: ${slot.label}`}
        className={cn(
          "relative h-24 w-32 shrink-0 overflow-hidden rounded-xl transition-opacity hover:opacity-90 sm:h-28 sm:w-36",
          focusRing,
          current ? "bg-brand-cream" : "border-2 border-dashed border-brand-beige bg-brand-cream/50"
        )}
      >
        {current ? (
          <Image
            src={current.url}
            alt=""
            fill
            sizes="144px"
            className="object-cover"
            style={{ objectPosition: current.position ?? "center" }}
          />
        ) : (
          <span className="flex h-full flex-col items-center justify-center gap-1 text-brand-graphite/40">
            <Camera size={20} aria-hidden="true" />
            <span className="text-[11px] font-medium">Sem foto</span>
          </span>
        )}
        {isPending ? (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 size={20} className="animate-spin text-brand-forest" aria-hidden="true" />
          </span>
        ) : null}
      </button>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-medium text-brand-graphite">{slot.label}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-brand-graphite/60">{slot.hint}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-brand-beige/60 px-2 py-0.5 text-[11px] text-brand-graphite/70">
            {ASPECT_LABELS[slot.aspect]}
          </span>
          {current ? null : (
            <span className="rounded-full bg-brand-gold/15 px-2 py-0.5 text-[11px] text-brand-graphite/70">
              Mostrando imagem ilustrativa
            </span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2" aria-live="polite">
          <Button
            type="button"
            variant="secondary"
            className="!px-3 !py-1.5 text-xs"
            onClick={() => setPickerOpen(true)}
            disabled={isPending}
          >
            {current ? "Trocar" : "Escolher foto"}
          </Button>
          {current ? (
            <>
              <Select
                aria-label={`Recorte da foto: ${slot.label}`}
                className="!w-auto !py-1.5 !pl-3 !pr-8 text-xs sm:!text-xs"
                value={current.position ?? "center"}
                onChange={(e) => handlePosition(e.target.value as ImagePosition)}
                disabled={isPending}
              >
                {(Object.keys(POSITION_LABELS) as ImagePosition[]).map((p) => (
                  <option key={p} value={p}>
                    Recorte: {POSITION_LABELS[p]}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant="ghost"
                className="!px-2.5 !py-1.5 text-xs text-brand-graphite/60 hover:text-red-600"
                onClick={() => {
                  if (confirm(`Tirar a foto de “${slot.label}”? O espaço volta para a imagem ilustrativa.`)) {
                    run(() => clearSlotImageAction(slot.key));
                  }
                }}
                disabled={isPending}
              >
                Remover
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePick}
        selectedId={current?.mediaId ?? null}
        title={`Foto — ${slot.label}`}
      />
    </li>
  );
}

function LibraryPanel({ media, usage }: { media: Media[]; usage: Record<string, string[]> }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(item: Media) {
    const usedIn = usage[item.id] ?? [];
    const message = usedIn.length
      ? `Esta foto está em uso em:\n• ${usedIn.join("\n• ")}\n\nApagar mesmo assim? Esses lugares voltam para a imagem ilustrativa.`
      : "Apagar esta foto da biblioteca?";
    if (!confirm(message)) return;
    setDeletingId(item.id);
    await deleteMediaAction(item.id);
    router.refresh();
    setDeletingId(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-beige pb-4">
        <div>
          <h2 className="font-serif text-xl text-brand-forest">Biblioteca</h2>
          <p className="text-sm text-brand-graphite/60">
            Todas as fotos enviadas. Dá para enviar várias de uma vez e usar a mesma foto em mais de um lugar.
          </p>
        </div>
        <UploadButton multiple label="Enviar fotos" onUploaded={() => router.refresh()} />
      </div>

      {media.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-brand-beige py-12 text-center text-sm text-brand-graphite/60">
          Nenhuma foto enviada ainda.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {media.map((item) => {
            const usedIn = usage[item.id] ?? [];
            return (
              <li key={item.id} className="flex flex-col overflow-hidden rounded-2xl border border-brand-beige bg-white">
                <div className="relative aspect-[4/3] bg-brand-cream">
                  <Image src={item.url} alt={item.alt ?? ""} fill sizes="240px" className="object-cover" />
                  {deletingId === item.id ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-white/70">
                      <Loader2 size={20} className="animate-spin text-brand-forest" aria-hidden="true" />
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 items-start justify-between gap-2 p-2.5">
                  <p
                    className={cn("line-clamp-2 min-w-0 text-xs", usedIn.length ? "text-brand-graphite/70" : "text-brand-graphite/40")}
                    title={usedIn.join("\n") || undefined}
                  >
                    {usedIn.length ? usedIn.join(", ") : "Não está em uso"}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                    className={cn(
                      "-m-1 shrink-0 rounded-lg p-1.5 text-brand-graphite/50 transition-colors hover:bg-red-50 hover:text-red-600",
                      focusRing
                    )}
                    aria-label="Apagar foto"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
