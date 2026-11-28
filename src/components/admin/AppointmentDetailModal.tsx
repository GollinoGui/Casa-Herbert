"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { AlertCircle, CalendarClock, Layers, MessageCircle, Phone, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Textarea, FieldLabel, Input } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { SaleModal, ProductSearch } from "@/components/admin/SaleModal";
import { SaleStatusBadge } from "@/components/admin/FinanceBadges";
import { addDaysToDateStr, formatShortDatePtBR, formatWeekdayPtBR, todayDateStr } from "@/lib/utils/date-format";
import { formatPhoneDisplay, toWhatsAppDigits } from "@/lib/utils/phone";
import { formatServicePrice } from "@/lib/utils/service-format";
import { formatBRL } from "@/lib/utils/money";
import { buildAppointmentMessage, buildWhatsAppLink } from "@/lib/booking/whatsapp";
import { buildChargeLink, openAmount } from "@/lib/finance/charge";
import {
  getAppointmentAction,
  confirmAppointmentAction,
  rejectAppointmentAction,
  cancelAppointmentAction,
  completeAppointmentAction,
  updateAdminNotesAction,
  updateAppointmentPriceAction,
  updateAppointmentDiscountAction,
  getAppointmentProductsAction,
  setAppointmentProductsAction,
  adminRescheduleAppointmentAction,
} from "@/lib/actions/admin/appointments";
import { getCustomerAppointmentsAction } from "@/lib/actions/admin/customers";
import { listOpenSalesAction, listSalesAction } from "@/lib/actions/admin/sales";
import { listActiveProductsAction } from "@/lib/actions/admin/products";
import { getSettingsAction } from "@/lib/actions/admin/settings";
import { markBookingConfirmationSentAction } from "@/lib/actions/admin/reminders";
import {
  listCustomerPackagesAction,
  consumePackageSessionAction,
  cancelPackageSessionAction,
  reopenPackageSessionAction,
} from "@/lib/actions/admin/packages";
import { PackageSessionsModal, freeSessions } from "@/components/admin/PackageSessionsScheduler";
import { useIsAdmin } from "@/components/admin/PanelUserProvider";
import type { AppointmentProduct, AppointmentWithRelations, CustomerPackage, PackageOutcome, Product, Sale, Settings } from "@/types";

interface AppointmentDetailModalProps {
  appointmentId: string | null;
  open: boolean;
  onClose: () => void;
  /** Chamado após qualquer mutação bem-sucedida (mudança de status, valores, venda). */
  onMutated?: () => void;
}

export function AppointmentDetailModal({ appointmentId, open, onClose, onMutated }: AppointmentDetailModalProps) {
  // Secretária: confirma, recusa, remarca e cancela. Valores, produtos, vendas, pacotes e conclusão ficam com o administrador.
  const isAdmin = useIsAdmin();
  const [appointment, setAppointment] = useState<AppointmentWithRelations | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [priceDraft, setPriceDraft] = useState<number | null>(null);
  const [discountDraft, setDiscountDraft] = useState(0);
  const [valuesDirty, setValuesDirty] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [otherVisits, setOtherVisits] = useState<number | null>(null);
  const [apptProducts, setApptProducts] = useState<AppointmentProduct[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [addingProduct, setAddingProduct] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [openSales, setOpenSales] = useState<Sale[]>([]);
  const [packages, setPackages] = useState<CustomerPackage[]>([]);
  const [packageError, setPackageError] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [unbooking, setUnbooking] = useState(false);
  const [noShow, setNoShow] = useState(false);
  const [outcome, setOutcome] = useState<PackageOutcome | null>(null);
  const [unbookReason, setUnbookReason] = useState("");
  const [makeupOpen, setMakeupOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function loadRelated(appt: AppointmentWithRelations) {
    listCustomerPackagesAction({ customerId: appt.customerId, serviceId: appt.serviceId }).then(setPackages);
    getAppointmentProductsAction(appt.id).then(setApptProducts);
    listSalesAction({ appointmentId: appt.id }).then(setSales);
    listOpenSalesAction(appt.customerId).then(setOpenSales);
  }

  function applyAppointment(appt: AppointmentWithRelations | null) {
    setAppointment(appt);
    setNotesDraft(appt?.adminNotes ?? "");
    setNotesDirty(false);
    setPriceDraft(appt?.priceCents ?? null);
    setDiscountDraft(appt?.discountCents ?? 0);
    setValuesDirty(false);
  }

  useEffect(() => {
    if (!open || !appointmentId) return;
    let cancelled = false;
    setLoading(true);
    setShowRejectForm(false);
    setShowCancelForm(false);
    setRejectReason("");
    setCancelReason("");
    setOtherVisits(null);
    setAddingProduct(false);
    setApptProducts([]);
    setSales([]);
    setOpenSales([]);
    setPackages([]);
    setPackageError(null);
    setRescheduling(false);
    setRescheduleError(null);
    setUnbooking(false);
    setNoShow(false);
    setOutcome(null);
    setUnbookReason("");
    Promise.all([getAppointmentAction(appointmentId), getSettingsAction()]).then(([appt, sett]) => {
      if (cancelled) return;
      applyAppointment(appt);
      setSettings(sett);
      if (appt) {
        if (isAdmin) loadRelated(appt);
        getCustomerAppointmentsAction(appt.customerId).then((history) => {
          if (!cancelled) setOtherVisits(history.filter((a) => a.id !== appt.id).length);
        });
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, appointmentId, isAdmin]);

  function refresh() {
    if (!appointmentId) return;
    getAppointmentAction(appointmentId).then((appt) => {
      applyAppointment(appt);
      if (appt && isAdmin) loadRelated(appt);
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

  function handleUsePackage(pkg: CustomerPackage) {
    if (!appointment) return;
    setPackageError(null);
    startTransition(async () => {
      const result = await consumePackageSessionAction(appointment.id, pkg.id);
      if (!result.ok) {
        setPackageError(result.error);
        return;
      }
      refresh();
    });
  }

  function startReschedule() {
    if (!appointment) return;
    setNewDate(appointment.date);
    setNewTime(appointment.startTime);
    setRescheduleError(null);
    setRescheduling(true);
  }

  function handleReschedule() {
    if (!appointment || !newDate || !newTime) return;
    setRescheduleError(null);
    startTransition(async () => {
      const result = await adminRescheduleAppointmentAction(appointment.id, newDate, newTime);
      if (!result.ok) {
        setRescheduleError(
          result.error === "SLOT_NO_LONGER_AVAILABLE" ? "Esse horário não está livre (ocupado, fechado ou fora do expediente)." : result.error
        );
        return;
      }
      setRescheduling(false);
      refresh();
    });
  }

  function handleUnbook() {
    if (!appointment || !outcome) return;
    setPackageError(null);
    startTransition(async () => {
      const result = await cancelPackageSessionAction(appointment.id, outcome, noShow, unbookReason);
      if (!result.ok) {
        setPackageError(result.error);
        return;
      }
      setUnbooking(false);
      refresh();
    });
  }

  function handleChangeOutcome(next: PackageOutcome) {
    if (!appointment) return;
    setPackageError(null);
    startTransition(async () => {
      const result = await cancelPackageSessionAction(appointment.id, next, appointment.noShow);
      if (!result.ok) {
        setPackageError(result.error);
        return;
      }
      refresh();
    });
  }

  function handleReopen() {
    if (!appointment) return;
    setPackageError(null);
    startTransition(async () => {
      const result = await reopenPackageSessionAction(appointment.id);
      if (!result.ok) {
        setPackageError(result.error);
        return;
      }
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

  function handleSaveValues() {
    if (!appointment) return;
    startTransition(async () => {
      await updateAppointmentPriceAction(appointment.id, priceDraft);
      await updateAppointmentDiscountAction(appointment.id, discountDraft);
      setValuesDirty(false);
      refresh();
    });
  }

  function saveProducts(next: AppointmentProduct[]) {
    if (!appointment) return;
    setApptProducts(next);
    startTransition(async () => {
      await setAppointmentProductsAction(
        appointment.id,
        next.map((p) => ({ productId: p.productId, quantity: p.quantity }))
      );
    });
  }

  function openProductPicker() {
    setAddingProduct(true);
    if (catalog.length === 0) listActiveProductsAction().then(setCatalog);
  }

  function templatedWhatsAppHref(kind: "confirmed" | "rejected" | "cancelled") {
    if (!appointment || !settings) return "#";
    const message = buildAppointmentMessage(kind, appointment, appointment.customer, appointment.service, settings.messageTemplates);
    return buildWhatsAppLink(appointment.customer.phone, message);
  }

  const active = appointment?.status === "PENDING" || appointment?.status === "CONFIRMED";
  const linkedPackage = appointment?.customerPackageId ? packages.find((p) => p.id === appointment.customerPackageId) ?? null : null;
  const isPackageSession = !!appointment?.customerPackageId;
  // Sessão de pacote já foi paga na venda: valor, produtos e checkout não se aplicam.
  const editable = active && !isPackageSession && isAdmin;
  const today = todayDateStr();
  const usablePackages = packages.filter(
    (p) => p.status === "active" && freeSessions(p) > 0 && (!p.expiresOn || !appointment || appointment.date <= p.expiresOn)
  );
  const productsTotal = apptProducts.reduce((s, p) => s + p.priceCents * p.quantity, 0);
  const totalOpen = openSales.reduce((s, sale) => s + openAmount(sale), 0);

  return (
    <Modal open={open} onClose={onClose} title="Detalhes do agendamento" widthClassName="max-w-xl">
      {loading || !appointment ? (
        <p className="py-8 text-center text-sm text-brand-graphite/50">Carregando...</p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h4 className="break-words font-serif text-lg text-brand-forest">{appointment.customer.fullName}</h4>
              <p className="text-sm text-brand-graphite/70">{formatPhoneDisplay(appointment.customer.phone)}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-brand-graphite/60">
                {otherVisits === null ? null : otherVisits === 0 ? (
                  <span className="rounded-full bg-brand-gold/15 px-2 py-0.5 font-medium text-brand-graphite/80">Primeiro agendamento</span>
                ) : (
                  <span>
                    Cliente cadastrado · {otherVisits} {otherVisits === 1 ? "outro agendamento" : "outros agendamentos"}
                  </span>
                )}
                <Link href={`/admin/clientes?cliente=${appointment.customerId}`} className="font-medium text-brand-moss hover:underline">
                  Ver ficha
                </Link>
              </p>
            </div>
            <StatusBadge status={appointment.status} />
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={`tel:+${toWhatsAppDigits(appointment.customer.phone)}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-beige px-4 py-2 text-xs font-medium text-brand-graphite transition hover:border-brand-moss"
            >
              <Phone size={14} /> Ligar
            </a>
            <a
              href={`https://wa.me/${toWhatsAppDigits(appointment.customer.phone)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-beige px-4 py-2 text-xs font-medium text-brand-graphite transition hover:border-brand-moss"
            >
              <MessageCircle size={14} /> Abrir WhatsApp
            </a>
          </div>

          {totalOpen > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                Este cliente tem <strong>{formatBRL(totalOpen)}</strong> em aberto.
              </p>
              <a
                href={buildChargeLink(appointment.customer.phone, appointment.customer.fullName, openSales)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-brand-graphite"
              >
                <MessageCircle size={14} /> Cobrar no WhatsApp
              </a>
            </div>
          ) : null}

          <div className="grid gap-3 rounded-xl border border-brand-beige bg-brand-cream/40 p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-graphite/50">Serviço</p>
              <p className="font-medium text-brand-graphite">{appointment.service.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-graphite/50">Data e horário</p>
              <p className="font-medium text-brand-graphite">
                {formatWeekdayPtBR(appointment.date)}, {formatShortDatePtBR(appointment.date)} · {appointment.startTime}–{appointment.endTime}
              </p>
              {active && !rescheduling ? (
                <button
                  type="button"
                  onClick={startReschedule}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-moss hover:underline"
                >
                  <CalendarClock size={13} aria-hidden="true" /> Remarcar
                </button>
              ) : null}
            </div>
            {active && rescheduling ? (
              <div className="space-y-2 rounded-xl border border-brand-beige bg-white p-3 sm:col-span-2">
                <p className="text-xs font-medium text-brand-graphite">Novo dia e horário</p>
                <div className="flex flex-wrap items-end gap-2">
                  <Input type="date" aria-label="Nova data" className="!w-auto flex-1" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                  <Input type="time" aria-label="Novo horário" className="!w-28" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
                </div>
                {newDate ? <p className="text-xs capitalize text-brand-graphite/60">{formatWeekdayPtBR(newDate)}</p> : null}
                {rescheduleError ? <p className="text-sm text-red-600">{rescheduleError}</p> : null}
                <div className="flex gap-2">
                  <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => setRescheduling(false)} disabled={isPending}>
                    Voltar
                  </Button>
                  <Button className="!px-3 !py-1.5 text-xs" onClick={handleReschedule} disabled={isPending || !newDate || !newTime}>
                    Salvar novo horário
                  </Button>
                </div>
                {isPackageSession ? <p className="text-xs text-brand-graphite/60">Continua sendo a mesma sessão do pacote.</p> : null}
              </div>
            ) : null}
            {editable ? (
              <div className="grid gap-3 sm:col-span-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div>
                  <FieldLabel htmlFor="appt-price" className="!text-xs !font-normal uppercase tracking-wide text-brand-graphite/50">
                    Valor do serviço
                  </FieldLabel>
                  <MoneyInput
                    id="appt-price"
                    className="!py-2"
                    value={priceDraft}
                    allowEmpty
                    placeholder="Sob consulta"
                    onChange={(v) => {
                      setPriceDraft(v);
                      setValuesDirty(true);
                    }}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="appt-discount" className="!text-xs !font-normal uppercase tracking-wide text-brand-graphite/50">
                    Desconto
                  </FieldLabel>
                  <MoneyInput
                    id="appt-discount"
                    className="!py-2"
                    value={discountDraft}
                    onChange={(v) => {
                      setDiscountDraft(v ?? 0);
                      setValuesDirty(true);
                    }}
                  />
                </div>
                <Button variant="secondary" className="!px-4 !py-2 text-xs" onClick={handleSaveValues} disabled={!valuesDirty || isPending}>
                  Salvar
                </Button>
              </div>
            ) : isPackageSession ? (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-brand-graphite/50">Valor</p>
                <p className="font-medium text-brand-graphite">Pago no pacote{linkedPackage ? ` “${linkedPackage.name}”` : ""}</p>
              </div>
            ) : (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-brand-graphite/50">Valor</p>
                <p className="font-medium text-brand-graphite">
                  {formatServicePrice(appointment.priceCents)}
                  {appointment.discountCents > 0 ? ` (desconto ${formatBRL(appointment.discountCents)})` : ""}
                </p>
              </div>
            )}
          </div>

          {editable || apptProducts.length > 0 ? (
            <div>
              <FieldLabel>Produtos que o cliente vai levar</FieldLabel>
              {apptProducts.length > 0 ? (
                <ul className="mb-2 space-y-1.5">
                  {apptProducts.map((p) => (
                    <li key={p.productId} className="flex items-center gap-3 rounded-xl border border-brand-beige px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">
                        {p.quantity}× {p.name}
                      </span>
                      <span className="tabular-nums">{formatBRL(p.priceCents * p.quantity)}</span>
                      {editable ? (
                        <button
                          type="button"
                          aria-label={`Remover ${p.name}`}
                          className="p-1 text-brand-graphite/50 hover:text-red-600"
                          onClick={() => saveProducts(apptProducts.filter((x) => x.productId !== p.productId))}
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {editable ? (
                addingProduct ? (
                  <ProductSearch
                    products={catalog}
                    stockLeft={(id) =>
                      (catalog.find((c) => c.id === id)?.stockQuantity ?? 0) - (apptProducts.find((x) => x.productId === id)?.quantity ?? 0)
                    }
                    onPick={(product) => {
                      setAddingProduct(false);
                      const existing = apptProducts.find((x) => x.productId === product.id);
                      saveProducts(
                        existing
                          ? apptProducts.map((x) => (x === existing ? { ...x, quantity: x.quantity + 1 } : x))
                          : [...apptProducts, { productId: product.id, quantity: 1, name: product.name, priceCents: product.priceCents }]
                      );
                    }}
                    onCancel={() => setAddingProduct(false)}
                  />
                ) : (
                  <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={openProductPicker}>
                    <Plus size={14} /> Adicionar produto
                  </Button>
                )
              ) : null}
              {editable && (appointment.priceCents != null || productsTotal > 0) ? (
                <p className="mt-2 text-sm text-brand-graphite/70">
                  Total previsto:{" "}
                  <strong className="tabular-nums text-brand-graphite">
                    {formatBRL(Math.max(0, (appointment.priceCents ?? 0) + productsTotal - appointment.discountCents))}
                  </strong>
                </p>
              ) : null}
            </div>
          ) : null}

          {sales.length > 0 ? (
            <div>
              <FieldLabel>Vendas deste atendimento</FieldLabel>
              <ul className="space-y-1.5">
                {sales.map((sale) => (
                  <li key={sale.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-beige px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1">{sale.items.map((i) => i.description).join(", ")}</span>
                    <SaleStatusBadge status={sale.status} partial={sale.paidCents > 0} />
                    <span className="tabular-nums font-medium">{formatBRL(sale.totalCents)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {appointment.customerNotes ? (
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-brand-graphite/50">Observações do cliente</p>
              <p className="rounded-xl bg-brand-cream/60 p-3 text-sm italic text-brand-graphite/80">{appointment.customerNotes}</p>
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
              <Button variant="secondary" className="!px-4 !py-2 text-xs" onClick={handleSaveNotes} disabled={!notesDirty || isPending}>
                Salvar observações
              </Button>
            </div>
          </div>

          <div className="border-t border-brand-beige pt-4">
            {active && isPackageSession ? (
              <div className="space-y-3">
                <p className="flex items-start gap-2 rounded-xl border border-brand-sage/50 bg-brand-sage/10 p-3 text-sm text-brand-graphite">
                  <Layers size={16} className="mt-0.5 shrink-0 text-brand-moss" aria-hidden="true" />
                  <span>
                    Sessão do pacote <strong className="font-medium">{linkedPackage?.name ?? ""}</strong>
                    {linkedPackage ? (
                      <span className="text-brand-graphite/70">
                        {" "}
                        · {linkedPackage.sessionsUsed} de {linkedPackage.sessionsTotal} feitas, {linkedPackage.sessionsScheduled}{" "}
                        {linkedPackage.sessionsScheduled === 1 ? "agendada" : "agendadas"}
                      </span>
                    ) : null}
                  </span>
                </p>
                {!unbooking ? (
                  <div className="flex flex-wrap gap-3">
                    {appointment.status === "PENDING" ? (
                      <Button onClick={handleConfirm} disabled={isPending}>
                        Confirmar
                      </Button>
                    ) : isAdmin ? (
                      <Button
                        onClick={() => linkedPackage && handleUsePackage(linkedPackage)}
                        disabled={isPending || !linkedPackage || appointment.date > today}
                      >
                        Concluir sessão
                      </Button>
                    ) : null}
                    <LinkButton
                    href={templatedWhatsAppHref("confirmed")}
                    onClick={() => void markBookingConfirmationSentAction(appointment.id)}
                    variant="gold"
                    target="_blank"
                    rel="noreferrer"
                  >
                      Enviar confirmação
                    </LinkButton>
                    {isAdmin ? (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setOutcome(null);
                          setNoShow(appointment.date < today);
                          setUnbookReason("");
                          setUnbooking(true);
                        }}
                        disabled={isPending}
                      >
                        Desmarcou ou faltou
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-3 rounded-xl border border-brand-beige p-3">
                    <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-brand-cream/60 p-1">
                      {(
                        [
                          [false, "Desmarcou"],
                          [true, "Não compareceu"],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={noShow === value}
                          onClick={() => setNoShow(value)}
                          className={
                            noShow === value
                              ? "rounded-lg bg-white px-2 py-2 text-sm font-medium text-brand-forest shadow-softer"
                              : "rounded-lg px-2 py-2 text-sm font-medium text-brand-graphite/70"
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <fieldset className="space-y-2">
                      <legend className="mb-1 text-sm font-medium text-brand-graphite">E a sessão?</legend>
                      {(
                        [
                          ["counted", "Conta a sessão", "Desconta do pacote, como se tivesse acontecido."],
                          ["returned", "Devolve ao pacote", "A sessão volta e você marca uma reposição."],
                        ] as const
                      ).map(([value, label, hint]) => (
                        <label
                          key={value}
                          className={
                            outcome === value
                              ? "flex cursor-pointer gap-3 rounded-xl border border-brand-forest bg-brand-forest/10 p-3"
                              : "flex cursor-pointer gap-3 rounded-xl border border-brand-beige p-3 hover:border-brand-sage"
                          }
                        >
                          <input
                            type="radio"
                            name="package-outcome"
                            value={value}
                            checked={outcome === value}
                            onChange={() => setOutcome(value)}
                            className="mt-1 h-4 w-4"
                          />
                          <span>
                            <span className="block text-sm font-medium text-brand-graphite">{label}</span>
                            <span className="block text-xs text-brand-graphite/60">{hint}</span>
                          </span>
                        </label>
                      ))}
                    </fieldset>
                    <div>
                      <FieldLabel htmlFor="unbook-reason">Motivo (opcional)</FieldLabel>
                      <Textarea id="unbook-reason" rows={2} value={unbookReason} onChange={(e) => setUnbookReason(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => setUnbooking(false)} disabled={isPending}>
                        Voltar
                      </Button>
                      <Button onClick={handleUnbook} disabled={isPending || !outcome}>
                        Confirmar
                      </Button>
                    </div>
                  </div>
                )}
                {!isAdmin ? (
                  <p className="text-xs text-brand-graphite/60">
                    Sessão de pacote: para concluir, desmarcar ou registrar falta, fale com o administrador. Para mudar o dia, use
                    Remarcar, lá em cima.
                  </p>
                ) : null}
                {isAdmin && appointment.status === "CONFIRMED" && appointment.date > today && !unbooking ? (
                  <p className="text-xs text-brand-graphite/60">
                    A sessão fica reservada no pacote e só é concluída no dia. Se a cliente não puder vir, use Remarcar (lá em cima) ou
                    “Desmarcou ou faltou”.
                  </p>
                ) : null}
                {packageError ? <p className="text-sm text-red-600">{packageError}</p> : null}
              </div>
            ) : null}

            {appointment.status === "CANCELLED" && isPackageSession && isAdmin ? (
              <div className="mb-3 space-y-2 rounded-xl border border-brand-beige p-3 text-sm text-brand-graphite">
                <p>
                  {appointment.noShow ? "A cliente não compareceu" : "A cliente desmarcou"} ·{" "}
                  <strong className="font-medium">
                    {appointment.packageOutcome === "counted" ? "a sessão contou no pacote" : "a sessão voltou para o pacote"}
                  </strong>
                  {linkedPackage ? <span className="text-brand-graphite/60"> ({linkedPackage.name})</span> : null}
                </p>
                <div className="flex flex-wrap gap-2">
                  {appointment.packageOutcome === "returned" && linkedPackage?.status === "active" && freeSessions(linkedPackage) > 0 ? (
                    <Button className="!px-3 !py-1.5 text-xs" onClick={() => setMakeupOpen(true)} disabled={isPending}>
                      <Plus size={14} /> Marcar reposição
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    className="!px-3 !py-1.5 text-xs"
                    onClick={() => handleChangeOutcome(appointment.packageOutcome === "counted" ? "returned" : "counted")}
                    disabled={isPending || !linkedPackage || linkedPackage.status === "cancelled"}
                  >
                    {appointment.packageOutcome === "counted" ? "Mudar: devolver a sessão" : "Mudar: contar a sessão"}
                  </Button>
                </div>
                {packageError ? <p className="text-sm text-red-600">{packageError}</p> : null}
              </div>
            ) : null}

            {appointment.status === "PENDING" && !isPackageSession ? (
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
                    <Textarea id="reject-reason" rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
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

            {appointment.status === "CONFIRMED" && !isPackageSession ? (
              <div className="space-y-3">
                {usablePackages.length ? (
                  <div className="space-y-2 rounded-xl border border-brand-sage/50 bg-brand-sage/10 p-3">
                    {usablePackages.map((pkg) => (
                      <div key={pkg.id} className="flex flex-wrap items-center justify-between gap-3">
                        <p className="flex min-w-0 items-center gap-2 text-sm text-brand-graphite">
                          <Layers size={16} className="shrink-0 text-brand-moss" aria-hidden="true" />
                          <span className="min-w-0">
                            <strong className="font-medium">{pkg.name}</strong>
                            <span className="text-brand-graphite/70"> · {freeSessions(pkg)} livre{freeSessions(pkg) === 1 ? "" : "s"} de {pkg.sessionsTotal}</span>
                          </span>
                        </p>
                        <Button onClick={() => handleUsePackage(pkg)} disabled={isPending || appointment.date > today} className="!px-4 !py-2 text-xs">
                          Usar sessão do pacote
                        </Button>
                      </div>
                    ))}
                    <p className="text-xs text-brand-graphite/60">
                      {appointment.date > today
                        ? "Dá para usar o pacote no dia do atendimento. Para reservar sessões com antecedência, agende pelo pacote."
                        : "Conclui o atendimento sem cobrar: o pacote já foi pago na venda."}
                    </p>
                    {packageError ? <p className="text-sm text-red-600">{packageError}</p> : null}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  {isAdmin ? (
                    <Button onClick={() => setCheckoutOpen(true)} disabled={isPending || valuesDirty}>
                      Finalizar e receber
                    </Button>
                  ) : null}
                  <LinkButton
                    href={templatedWhatsAppHref("confirmed")}
                    onClick={() => void markBookingConfirmationSentAction(appointment.id)}
                    variant="gold"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Enviar confirmação
                  </LinkButton>
                  {isAdmin ? (
                    <Button variant="secondary" onClick={handleComplete} disabled={isPending}>
                      Concluir sem venda
                    </Button>
                  ) : null}
                  {!showCancelForm ? (
                    <Button variant="ghost" onClick={() => setShowCancelForm(true)} disabled={isPending}>
                      Cancelar
                    </Button>
                  ) : null}
                </div>
                {valuesDirty ? <p className="text-xs text-amber-800">Salve o valor/desconto antes de finalizar.</p> : null}
                {showCancelForm ? (
                  <div className="space-y-2 rounded-xl border border-brand-beige p-3">
                    <FieldLabel htmlFor="cancel-reason">Motivo do cancelamento (opcional)</FieldLabel>
                    <Textarea id="cancel-reason" rows={2} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
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
              <div className="space-y-2">
                <p className="text-sm text-brand-graphite/60">
                  {appointment.customerPackageId
                    ? `Atendimento concluído com uma sessão do pacote${linkedPackage ? ` “${linkedPackage.name}” (${linkedPackage.sessionsUsed} de ${linkedPackage.sessionsTotal} usadas)` : ""}.`
                    : "Atendimento concluído."}
                </p>
                {isAdmin && isPackageSession && appointment.date > today ? (
                  <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <p>Esta sessão foi concluída antes do dia. Reabra para poder remarcar ou desmarcar.</p>
                    <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={handleReopen} disabled={isPending}>
                      Reabrir sessão
                    </Button>
                    {packageError ? <p className="text-sm text-red-600">{packageError}</p> : null}
                  </div>
                ) : null}
                {isAdmin ? (
                  <>
                    <Button variant="secondary" onClick={() => setPendingOpen(true)}>
                      <Plus size={16} /> Lançar algo que ficou sem pagar
                    </Button>
                    <p className="text-xs text-brand-graphite/50">
                      Ex.: o cliente levou um produto e não foi cobrado. Fica em Contas a receber e dá para cobrar pelo WhatsApp.
                    </p>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )}
      {isAdmin ? (
        <>
          <PackageSessionsModal
            open={makeupOpen}
            pkg={linkedPackage}
            count={1}
            initialDate={appointment ? addDaysToDateStr(appointment.date < today ? today : appointment.date, 7) : undefined}
            initialTime={appointment?.startTime}
            onClose={() => setMakeupOpen(false)}
            onDone={() => {
              setMakeupOpen(false);
              refresh();
            }}
          />
          <SaleModal
            open={checkoutOpen}
            onClose={() => setCheckoutOpen(false)}
            appointment={appointment}
            onCompleted={() => {
              setCheckoutOpen(false);
              refresh();
            }}
          />
          <SaleModal
            open={pendingOpen}
            mode="pending"
            onClose={() => setPendingOpen(false)}
            appointment={appointment}
            onCompleted={() => {
              setPendingOpen(false);
              refresh();
            }}
          />
        </>
      ) : null}
    </Modal>
  );
}
