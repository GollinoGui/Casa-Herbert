"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, FieldLabel, FieldError } from "@/components/ui/Field";
import { serviceFormSchema } from "@/lib/booking/validators";
import { createServiceAction, updateServiceAction, setServiceActiveAction } from "@/lib/actions/admin/services";
import { cn } from "@/lib/utils/cn";
import type { Service } from "@/types";

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

function formatPrice(cents: number | null) {
  if (cents === null) return "Sob consulta";
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export function ServicesManager({ services }: { services: Service[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus size={16} /> Novo serviço
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-brand-beige bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-brand-beige bg-brand-cream/50 text-xs uppercase tracking-wide text-brand-graphite/60">
            <tr>
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
                <td colSpan={5} className="px-4 py-8 text-center text-brand-graphite/50">
                  Nenhum serviço cadastrado.
                </td>
              </tr>
            ) : (
              services.map((s) => (
                <tr key={s.id} className={cn("border-b border-brand-beige/60", !s.isActive && "opacity-60")}>
                  <td className="px-4 py-3 font-medium text-brand-graphite">{s.name}</td>
                  <td className="px-4 py-3">{s.durationMinutes} min</td>
                  <td className="px-4 py-3">{formatPrice(s.priceCents)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        s.isActive ? "bg-brand-forest/10 text-brand-forest" : "bg-brand-graphite/10 text-brand-graphite/70"
                      )}
                    >
                      {s.isActive ? "Ativo" : "Inativo"}
                    </span>
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
  const {
    register,
    handleSubmit,
    reset,
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
        }
      : { name: "", description: "", durationMinutes: 60, priceCents: null, isActive: true },
  });

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
