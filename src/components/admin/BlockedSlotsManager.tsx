"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, AlertTriangle, X } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select, FieldLabel, FieldError } from "@/components/ui/Field";
import { blockSlotSchema } from "@/lib/booking/validators";
import { createBlockedSlotAction, deleteBlockedSlotAction } from "@/lib/actions/admin/blocked-slots";
import { BLOCK_REASON_LABELS } from "@/lib/booking/constants";
import { formatShortDatePtBR } from "@/lib/utils/date-format";
import type { AppointmentWithRelations, BlockedSlot } from "@/types";

type BlockFormValues = z.infer<typeof blockSlotSchema>;

export function BlockedSlotsManager({ blockedSlots }: { blockedSlots: BlockedSlot[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [conflicts, setConflicts] = useState<AppointmentWithRelations[] | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Remover este bloqueio?")) return;
    await deleteBlockedSlotAction(id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {conflicts && conflicts.length > 0 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20} />
          <div className="flex-1 text-sm text-amber-900">
            <p className="font-medium">
              Atenção: {conflicts.length} agendamento(s) existente(s) caem dentro deste bloqueio.
            </p>
            <ul className="mt-2 space-y-1">
              {conflicts.map((a) => (
                <li key={a.id}>
                  {a.customer.fullName} — {formatShortDatePtBR(a.date)} às {a.startTime} ({a.service.name})
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs">
              Nada foi cancelado automaticamente. Entre em contato com os clientes para reagendar.
            </p>
          </div>
          <button onClick={() => setConflicts(null)} className="text-amber-600 hover:text-amber-800" aria-label="Fechar aviso">
            <X size={16} />
          </button>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Novo bloqueio
        </Button>
      </div>

      <div className="space-y-3">
        {blockedSlots.length === 0 ? (
          <p className="text-sm text-brand-graphite/60">Nenhum bloqueio cadastrado.</p>
        ) : (
          blockedSlots.map((b) => (
            <div key={b.id} className="flex items-start justify-between gap-4 rounded-2xl border border-brand-beige bg-white p-4">
              <div className="min-w-0">
                <p className="font-medium text-brand-graphite">
                  {b.startDate === b.endDate
                    ? formatShortDatePtBR(b.startDate)
                    : `${formatShortDatePtBR(b.startDate)} — ${formatShortDatePtBR(b.endDate)}`}
                  {b.isFullDay ? " · Dia inteiro" : ` · ${b.startTime}–${b.endTime}`}
                </p>
                <p className="text-sm text-brand-graphite/60">{BLOCK_REASON_LABELS[b.reason]}</p>
                {b.notes ? <p className="mt-1 text-xs text-brand-graphite/50">{b.notes}</p> : null}
              </div>
              <button
                onClick={() => handleDelete(b.id)}
                className="-mr-1 -mt-1 shrink-0 rounded-lg p-2 text-brand-graphite/50 hover:bg-red-50 hover:text-red-600"
                aria-label="Remover"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      <BlockFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={(newConflicts) => {
          setModalOpen(false);
          setConflicts(newConflicts);
          router.refresh();
        }}
      />
    </div>
  );
}

function BlockFormModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (conflicts: AppointmentWithRelations[]) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BlockFormValues>({
    resolver: zodResolver(blockSlotSchema),
    defaultValues: { startDate: "", endDate: "", isFullDay: true, reason: "personal", notes: "" },
  });

  const isFullDay = watch("isFullDay");

  async function onSubmit(values: BlockFormValues) {
    const result = await createBlockedSlotAction(values);
    reset();
    onSaved(result.conflicting);
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo bloqueio">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="startDate">Data inicial</FieldLabel>
            <Input id="startDate" type="date" {...register("startDate")} />
            <FieldError>{errors.startDate?.message}</FieldError>
          </div>
          <div>
            <FieldLabel htmlFor="endDate">Data final</FieldLabel>
            <Input id="endDate" type="date" {...register("endDate")} />
            <FieldError>{errors.endDate?.message}</FieldError>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-brand-graphite">
          <input type="checkbox" {...register("isFullDay")} className="h-4 w-4 rounded border-brand-beige" />
          Bloquear o(s) dia(s) inteiro(s)
        </label>
        <FieldError>{errors.isFullDay?.message}</FieldError>

        {!isFullDay ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="startTime">Das</FieldLabel>
              <Input id="startTime" type="time" {...register("startTime")} />
            </div>
            <div>
              <FieldLabel htmlFor="endTime">Até</FieldLabel>
              <Input id="endTime" type="time" {...register("endTime")} />
            </div>
            <FieldError>{errors.startTime?.message}</FieldError>
          </div>
        ) : null}

        <div>
          <FieldLabel htmlFor="reason">Motivo</FieldLabel>
          <Select id="reason" {...register("reason")}>
            {Object.entries(BLOCK_REASON_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <FieldLabel htmlFor="notes">Observações (opcional)</FieldLabel>
          <Textarea id="notes" rows={2} {...register("notes")} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Criar bloqueio"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
