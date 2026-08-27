"use client";

import { useEffect, useState, useTransition } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Textarea, FieldLabel } from "@/components/ui/Field";
import { formatShortDatePtBR, formatWeekdayPtBR } from "@/lib/utils/date-format";
import { formatPhoneDisplay, toWhatsAppDigits } from "@/lib/utils/phone";
import { buildAppointmentMessage, buildWhatsAppLink } from "@/lib/booking/whatsapp";
import {
  getAppointmentAction,
  confirmAppointmentAction,
  rejectAppointmentAction,
  cancelAppointmentAction,
  completeAppointmentAction,
  updateAdminNotesAction,
} from "@/lib/actions/admin/appointments";
import { getSettingsAction } from "@/lib/actions/admin/settings";
import type { AppointmentWithRelations, Settings } from "@/types";

interface AppointmentDetailModalProps {
  appointmentId: string | null;
  open: boolean;
  onClose: () => void;
  /** Chamado após qualquer mutação bem-sucedida (mudança de status ou observações). */
  onMutated?: () => void;
}

export function AppointmentDetailModal({
  appointmentId,
  open,
  onClose,
  onMutated,
}: AppointmentDetailModalProps) {
  const [appointment, setAppointment] = useState<AppointmentWithRelations | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !appointmentId) return;
    let cancelled = false;
    setLoading(true);
    setShowRejectForm(false);
    setShowCancelForm(false);
    setRejectReason("");
    setCancelReason("");
    Promise.all([getAppointmentAction(appointmentId), getSettingsAction()]).then(([appt, sett]) => {
      if (cancelled) return;
      setAppointment(appt);
      setSettings(sett);
      setNotesDraft(appt?.adminNotes ?? "");
      setNotesDirty(false);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, appointmentId]);

  function refresh() {
    if (!appointmentId) return;
    getAppointmentAction(appointmentId).then((appt) => {
      setAppointment(appt);
      setNotesDraft(appt?.adminNotes ?? "");
      setNotesDirty(false);
    });
    onMutated?.();
  }

  function handleConfirm() {
    if (!appointment) return;
    startTransition(async () => {
      await confirmAppointmentAction(appointment.id);
      refresh();
    });
  }

  function handleReject() {
    if (!appointment) return;
    startTransition(async () => {
      await rejectAppointmentAction(appointment.id, rejectReason.trim() || undefined);
      setShowRejectForm(false);
      refresh();
    });
  }

  function handleCancel() {
    if (!appointment) return;
    startTransition(async () => {
      await cancelAppointmentAction(appointment.id, cancelReason.trim() || undefined);
      setShowCancelForm(false);
      refresh();
    });
  }

  function handleComplete() {
    if (!appointment) return;
    startTransition(async () => {
      await completeAppointmentAction(appointment.id);
      refresh();
    });
  }

  function handleSaveNotes() {
    if (!appointment) return;
    startTransition(async () => {
      await updateAdminNotesAction(appointment.id, notesDraft);
      setNotesDirty(false);
      onMutated?.();
    });
  }

  function templatedWhatsAppHref(kind: "confirmed" | "rejected" | "cancelled") {
    if (!appointment || !settings) return "#";
    const message = buildAppointmentMessage(
      kind,
      appointment,
      appointment.customer,
      appointment.service,
      settings.messageTemplates
    );
    return buildWhatsAppLink(appointment.customer.phone, message);
  }

  return (
    <Modal open={open} onClose={onClose} title="Detalhes do agendamento" widthClassName="max-w-xl">
      {loading || !appointment ? (
        <p className="py-8 text-center text-sm text-brand-graphite/50">Carregando...</p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-serif text-lg text-brand-forest">{appointment.customer.fullName}</h4>
              <p className="text-sm text-brand-graphite/70">{formatPhoneDisplay(appointment.customer.phone)}</p>
            </div>
            <StatusBadge status={appointment.status} />
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={`tel:+${toWhatsAppDigits(appointment.customer.phone)}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-beige px-3 py-1.5 text-xs font-medium text-brand-graphite transition hover:border-brand-moss"
            >
              <Phone size={14} /> Ligar
            </a>
            <a
              href={`https://wa.me/${toWhatsAppDigits(appointment.customer.phone)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-beige px-3 py-1.5 text-xs font-medium text-brand-graphite transition hover:border-brand-moss"
            >
              <MessageCircle size={14} /> Abrir WhatsApp
            </a>
          </div>

          <div className="grid gap-3 rounded-xl border border-brand-beige bg-brand-cream/40 p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-graphite/50">Serviço</p>
              <p className="font-medium text-brand-graphite">{appointment.service.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-graphite/50">Data e horário</p>
              <p className="font-medium text-brand-graphite">
                {formatWeekdayPtBR(appointment.date)}, {formatShortDatePtBR(appointment.date)} ·{" "}
                {appointment.startTime}–{appointment.endTime}
              </p>
            </div>
          </div>

          {appointment.customerNotes ? (
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-brand-graphite/50">Observações do cliente</p>
              <p className="rounded-xl bg-brand-cream/60 p-3 text-sm italic text-brand-graphite/80">
                {appointment.customerNotes}
              </p>
            </div>
          ) : null}

          <div>
            <FieldLabel htmlFor="admin-notes">Observações internas</FieldLabel>
            <Textarea
              id="admin-notes"
              rows={3}
              value={notesDraft}
              onChange={(e) => {
                setNotesDraft(e.target.value);
                setNotesDirty(true);
              }}
            />
            <div className="mt-2">
              <Button
                variant="secondary"
                className="!px-4 !py-2 text-xs"
                onClick={handleSaveNotes}
                disabled={!notesDirty || isPending}
              >
                Salvar observações
              </Button>
            </div>
          </div>

          <div className="border-t border-brand-beige pt-4">
            {appointment.status === "PENDING" ? (
              <div className="space-y-3">
                {!showRejectForm ? (
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleConfirm} disabled={isPending}>
                      Confirmar
                    </Button>
                    <Button variant="secondary" onClick={() => setShowRejectForm(true)} disabled={isPending}>
                      Recusar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-xl border border-brand-beige p-3">
                    <FieldLabel htmlFor="reject-reason">Motivo da recusa (opcional)</FieldLabel>
                    <Textarea
                      id="reject-reason"
                      rows={2}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => setShowRejectForm(false)} disabled={isPending}>
                        Voltar
                      </Button>
                      <Button onClick={handleReject} disabled={isPending}>
                        Confirmar recusa
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {appointment.status === "CONFIRMED" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  <LinkButton href={templatedWhatsAppHref("confirmed")} variant="gold" target="_blank" rel="noreferrer">
                    Enviar confirmação pelo WhatsApp
                  </LinkButton>
                  <Button variant="secondary" onClick={handleComplete} disabled={isPending}>
                    Marcar como concluído
                  </Button>
                  {!showCancelForm ? (
                    <Button variant="ghost" onClick={() => setShowCancelForm(true)} disabled={isPending}>
                      Cancelar
                    </Button>
                  ) : null}
                </div>
                {showCancelForm ? (
                  <div className="space-y-2 rounded-xl border border-brand-beige p-3">
                    <FieldLabel htmlFor="cancel-reason">Motivo do cancelamento (opcional)</FieldLabel>
                    <Textarea
                      id="cancel-reason"
                      rows={2}
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => setShowCancelForm(false)} disabled={isPending}>
                        Voltar
                      </Button>
                      <Button onClick={handleCancel} disabled={isPending}>
                        Confirmar cancelamento
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {appointment.status === "REJECTED" ? (
              <LinkButton href={templatedWhatsAppHref("rejected")} variant="secondary" target="_blank" rel="noreferrer">
                Enviar recusa pelo WhatsApp
              </LinkButton>
            ) : null}

            {appointment.status === "CANCELLED" ? (
              <LinkButton href={templatedWhatsAppHref("cancelled")} variant="secondary" target="_blank" rel="noreferrer">
                Avisar cliente pelo WhatsApp
              </LinkButton>
            ) : null}

            {appointment.status === "COMPLETED" ? (
              <p className="text-sm text-brand-graphite/50">Agendamento concluído.</p>
            ) : null}
          </div>
        </div>
      )}
    </Modal>
  );
}
