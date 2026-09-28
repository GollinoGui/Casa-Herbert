"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, ArrowUp, ArrowDown, Camera } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ActiveBadge } from "@/components/ui/Badge";
import { Input, Textarea, FieldLabel, FieldError } from "@/components/ui/Field";
import { ImageField } from "@/components/admin/MediaPicker";
import { serviceFormSchema } from "@/lib/booking/validators";
import {
  createServiceAction,
  updateServiceAction,
  setServiceActiveAction,
  moveServiceAction,
} from "@/lib/actions/admin/services";
import { cn } from "@/lib/utils/cn";
import type { Service } from "@/types";

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

export function ServicesManager({ services }: { services: Service[] }) {
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
        <p className="max-w-xl text-sm text-brand-graphite/60">
          A ordem aqui é a do site e do carrossel &quot;Nossos cuidados&quot; da página inicial. Em cada serviço dá
          para escolher a foto do card e se ele aparece no carrossel.
        </p>
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
                  <ServiceThumb service={s} />
                  <div className="min-w-0">
                    <p className="font-medium text-brand-graphite">{s.name}</p>
                    <p className="mt-0.5 text-xs text-brand-graphite/60">
                      {s.durationMinutes} min · {formatPrice(s.priceCents)}
                    </p>
                  </div>
                </div>
                {renderMoveButtons(s, index)}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <ActiveBadge active={s.isActive} />
                <CarouselBadge service={s} />
              </div>
              <div className="mt-3 flex gap-2 border-t border-brand-beige/70 pt-3">
                <Button variant="secondary" className="flex-1 !px-3 !py-2 text-xs" onClick={() => openEdit(s)}>
                  <Pencil size={14} /> Editar
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
                      <ServiceThumb service={s} />
                      <span className="font-medium text-brand-graphite">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{s.durationMinutes} min</td>
                  <td className="px-4 py-3">{formatPrice(s.priceCents)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <ActiveBadge active={s.isActive} />
                      <CarouselBadge service={s} />
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

      <ServiceFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        service={editing}
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
};

function ServiceFormModal({
  open,
  onClose,
  service,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  service: Service | null;
  onSaved: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
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
        }
      : EMPTY_SERVICE,
  });

  useEffect(() => {
    if (open) setImageUrl(service?.imageUrl ?? null);
  }, [open, service]);

  async function onSubmit(values: ServiceFormValues) {
    const payload = { ...values, priceCents: values.priceCents ?? null };
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
            <FieldLabel htmlFor="priceCents">Preço (centavos)</FieldLabel>
            <Input
              id="priceCents"
              type="number"
              placeholder="Vazio = sob consulta"
              {...register("priceCents", {
                setValueAs: (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
              })}
            />
            <FieldError>{errors.priceCents?.message}</FieldError>
          </div>
        </div>

        <div>
          <FieldLabel>Foto do card</FieldLabel>
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
    </Modal>
  );
}
