"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, ArrowUp, ArrowDown, Camera, ScanBarcode, FlaskConical } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ActiveBadge } from "@/components/ui/Badge";
import { Input, Textarea, FieldLabel, FieldError } from "@/components/ui/Field";
import { ImageField } from "@/components/admin/MediaPicker";
import { BarcodeScanner } from "@/components/admin/BarcodeScanner";
import { ServiceRecipeModal } from "@/components/admin/ServiceRecipeModal";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { serviceFormSchema } from "@/lib/booking/validators";
import {
  createServiceAction,
  updateServiceAction,
  setServiceActiveAction,
  moveServiceAction,
} from "@/lib/actions/admin/services";
import { cn } from "@/lib/utils/cn";
import type { Product, Service, ServiceProduct } from "@/types";

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

function formatPrice(cents: number | null) {
  if (cents === null) return "Sob consulta";
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function ServiceThumb({ service }: { service: Service }) {
  return (
    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-brand-cream">
      {service.imageUrl ? (
        <Image
          src={service.imageUrl}
          alt=""
          fill
          sizes="44px"
          className="object-cover"
          style={{ objectPosition: service.imagePosition ?? "center" }}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-brand-forest/40">
          <Camera size={16} />
        </span>
      )}
    </div>
  );
}

function CarouselBadge({ service }: { service: Service }) {
  if (!service.showOnHome || !service.isActive) return null;
  return (
    <span className="rounded-full bg-brand-gold/15 px-2.5 py-0.5 text-xs font-medium text-brand-graphite/80">
      No carrossel
    </span>
  );
}

function recipeHint(recipe: ServiceProduct[] | undefined) {
  if (!recipe?.length) return "Não gasta produto";
  return recipe.length === 1 ? `Gasta ${recipe[0].name}` : `Gasta ${recipe.length} produtos`;
}

export function ServicesManager({
  services,
  siteEnabled,
  recipes,
  products,
}: {
  services: Service[];
  siteEnabled: boolean;
  recipes: Record<string, ServiceProduct[]>;
  products: Product[];
}) {
  const [recipeFor, setRecipeFor] = useState<Service | null>(null);
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [isMoving, startMove] = useTransition();

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(service: Service) {
    setEditing(service);
    setModalOpen(true);
  }

  async function handleToggleActive(service: Service) {
    await setServiceActiveAction(service.id, !service.isActive);
    router.refresh();
  }

  function handleMove(service: Service, direction: "up" | "down") {
    startMove(async () => {
      await moveServiceAction(service.id, direction);
      router.refresh();
    });
  }

  function renderMoveButtons(service: Service, index: number) {
    return (
      <div className="flex">
        <button
          onClick={() => handleMove(service, "up")}
          disabled={index === 0 || isMoving}
          className="rounded-lg p-1.5 text-brand-graphite/60 hover:bg-brand-cream hover:text-brand-forest disabled:opacity-30"
          aria-label="Mover para cima"
        >
          <ArrowUp size={16} />
        </button>
        <button
          onClick={() => handleMove(service, "down")}
          disabled={index === services.length - 1 || isMoving}
          className="rounded-lg p-1.5 text-brand-graphite/60 hover:bg-brand-cream hover:text-brand-forest disabled:opacity-30"
          aria-label="Mover para baixo"
        >
          <ArrowDown size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {siteEnabled ? (
          <p className="max-w-xl text-sm text-brand-graphite/60">
            A ordem aqui é a do site e do carrossel &quot;Nossos cuidados&quot; da página inicial. Em cada serviço dá
            para escolher a foto do card e se ele aparece no carrossel.
          </p>
        ) : (
          <span />
        )}
        <Button onClick={openCreate}>
          <Plus size={16} /> Novo serviço
        </Button>
      </div>

      <ul className="space-y-2 md:hidden">
        {services.length === 0 ? (
          <li className="rounded-2xl border border-brand-beige bg-white px-4 py-8 text-center text-sm text-brand-graphite/50">
            Nenhum serviço cadastrado.
          </li>
        ) : (
          services.map((s, index) => (
            <li
              key={s.id}
              className={cn("rounded-2xl border border-brand-beige bg-white p-4", !s.isActive && "opacity-60")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {siteEnabled ? <ServiceThumb service={s} /> : null}
                  <div className="min-w-0">
                    <p className="font-medium text-brand-graphite">{s.name}</p>
                    <p className="mt-0.5 text-xs text-brand-graphite/60">
                      {s.durationMinutes} min · {formatPrice(s.priceCents)}
                    </p>
                    <p className="mt-0.5 text-xs text-brand-graphite/50">{recipeHint(recipes[s.id])}</p>
                  </div>
                </div>
                {renderMoveButtons(s, index)}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <ActiveBadge active={s.isActive} />
                {siteEnabled ? <CarouselBadge service={s} /> : null}
              </div>
              <div className="mt-3 flex gap-2 border-t border-brand-beige/70 pt-3">
                <Button variant="secondary" className="flex-1 !px-3 !py-2 text-xs" onClick={() => openEdit(s)}>
                  <Pencil size={14} /> Editar
                </Button>
                <Button variant="secondary" className="flex-1 !px-3 !py-2 text-xs" onClick={() => setRecipeFor(s)}>
                  <FlaskConical size={14} /> Consumo
                </Button>
                <Button variant="ghost" className="flex-1 !px-3 !py-2 text-xs" onClick={() => handleToggleActive(s)}>
                  {s.isActive ? "Desativar" : "Reativar"}
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>

      <div className="hidden overflow-x-auto rounded-2xl border border-brand-beige bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-beige bg-brand-cream/50 text-xs uppercase tracking-wide text-brand-graphite/60">
            <tr>
              <th className="px-4 py-3">Ordem</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Duração</th>
              <th className="px-4 py-3">Preço</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-brand-graphite/50">
                  Nenhum serviço cadastrado.
                </td>
              </tr>
            ) : (
              services.map((s, index) => (
                <tr key={s.id} className={cn("border-b border-brand-beige/60", !s.isActive && "opacity-60")}>
                  <td className="px-2 py-3">{renderMoveButtons(s, index)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {siteEnabled ? <ServiceThumb service={s} /> : null}
                      <div className="min-w-0">
                        <span className="font-medium text-brand-graphite">{s.name}</span>
                        <p className="text-xs text-brand-graphite/50">{recipeHint(recipes[s.id])}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{s.durationMinutes} min</td>
                  <td className="px-4 py-3">{formatPrice(s.priceCents)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <ActiveBadge active={s.isActive} />
                      {siteEnabled ? <CarouselBadge service={s} /> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(s)}
                        className="rounded-lg p-1.5 text-brand-graphite/60 hover:bg-brand-cream hover:text-brand-forest"
                        aria-label="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setRecipeFor(s)}
                        className="rounded-lg p-1.5 text-brand-graphite/60 hover:bg-brand-cream hover:text-brand-forest"
                        aria-label={`Consumo de produtos: ${s.name}`}
                        title="Consumo de produtos"
                      >
                        <FlaskConical size={16} />
                      </button>
                      <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => handleToggleActive(s)}>
                        {s.isActive ? "Desativar" : "Reativar"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ServiceRecipeModal
        service={recipeFor}
        recipe={recipeFor ? recipes[recipeFor.id] ?? [] : []}
        products={products}
        onClose={() => setRecipeFor(null)}
        onSaved={() => {
          setRecipeFor(null);
          router.refresh();
        }}
      />

      <ServiceFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        service={editing}
        siteEnabled={siteEnabled}
        onSaved={() => {
          setModalOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

const EMPTY_SERVICE: ServiceFormValues = {
  name: "",
  description: "",
  durationMinutes: 60,
  priceCents: null,
  isActive: true,
  imageId: null,
  imagePosition: null,
  showOnHome: true,
  barcode: "",
};

function ServiceFormModal({
  open,
  onClose,
  service,
  onSaved,
  siteEnabled,
}: {
  siteEnabled: boolean;
  open: boolean;
  onClose: () => void;
  service: Service | null;
  onSaved: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    values: service
      ? {
          name: service.name,
          description: service.description,
          durationMinutes: service.durationMinutes,
          priceCents: service.priceCents,
          isActive: service.isActive,
          imageId: service.imageId,
          imagePosition: service.imagePosition,
          showOnHome: service.showOnHome,
          barcode: service.barcode ?? "",
        }
      : EMPTY_SERVICE,
  });

  useEffect(() => {
    if (open) setImageUrl(service?.imageUrl ?? null);
  }, [open, service]);

  async function onSubmit(values: ServiceFormValues) {
    const payload = { ...values, priceCents: values.priceCents ?? null, barcode: values.barcode || null };
    if (service) {
      await updateServiceAction(service.id, payload);
    } else {
      await createServiceAction(payload);
    }
    reset();
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={service ? "Editar serviço" : "Novo serviço"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <FieldLabel htmlFor="name">Nome</FieldLabel>
          <Input id="name" {...register("name")} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div>
          <FieldLabel htmlFor="description">Descrição</FieldLabel>
          <Textarea id="description" rows={3} {...register("description")} />
          <FieldError>{errors.description?.message}</FieldError>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="durationMinutes">Duração (min)</FieldLabel>
            <Input id="durationMinutes" type="number" step={5} {...register("durationMinutes")} />
            <FieldError>{errors.durationMinutes?.message}</FieldError>
          </div>
          <div>
            <FieldLabel htmlFor="priceCents">Preço</FieldLabel>
            <MoneyInput
              id="priceCents"
              allowEmpty
              placeholder="Sob consulta"
              value={watch("priceCents") ?? null}
              onChange={(v) => setValue("priceCents", v, { shouldDirty: true, shouldValidate: true })}
            />
            <FieldError>{errors.priceCents?.message}</FieldError>
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="barcode">Código de barras (opcional)</FieldLabel>
          <div className="flex gap-2">
            <Input id="barcode" inputMode="numeric" {...register("barcode")} />
            <Button type="button" variant="secondary" className="!px-3" onClick={() => setScannerOpen(true)} aria-label="Ler código de barras">
              <ScanBarcode size={18} />
            </Button>
          </div>
          <FieldError>{errors.barcode?.message}</FieldError>
        </div>

        {siteEnabled ? (
          <>
            <div>
              <FieldLabel>Foto do card (site)</FieldLabel>
              <div className="max-w-xs">
                <ImageField
                  label={watch("name") || "Serviço"}
                  imageUrl={imageUrl}
                  mediaId={watch("imageId")}
                  position={watch("imagePosition")}
                  onChange={(media) => {
                    setImageUrl(media?.url ?? null);
                    setValue("imageId", media?.id ?? null, { shouldDirty: true });
                    if (!media) setValue("imagePosition", null, { shouldDirty: true });
                  }}
                  onPositionChange={(position) => setValue("imagePosition", position, { shouldDirty: true })}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-brand-graphite">
              <input type="checkbox" {...register("showOnHome")} className="h-4 w-4 rounded border-brand-beige" />
              Exibir no carrossel &quot;Nossos cuidados&quot; da página inicial
            </label>
          </>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-brand-graphite">
          <input type="checkbox" {...register("isActive")} className="h-4 w-4 rounded border-brand-beige" />
          Serviço ativo (visível para agendamento)
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          setScannerOpen(false);
          setValue("barcode", code, { shouldDirty: true });
        }}
      />
    </Modal>
  );
}
