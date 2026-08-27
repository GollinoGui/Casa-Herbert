"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, Loader2 } from "lucide-react";
import type { AvailabilityResult, Service, SlotUnavailableReason } from "@/types";
import { bookingRequestSchema, type BookingRequestInput } from "@/lib/booking/validators";
import { getAvailableSlotsAction, submitBookingAction } from "@/lib/actions/booking";
import { formatLongDatePtBR } from "@/lib/utils/date-format";
import { formatServiceDuration, formatServicePrice } from "@/lib/utils/service-format";
import { Card } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { FieldError, FieldLabel, Input, Textarea } from "@/components/ui/Field";
import { DateCalendar } from "@/components/booking/DateCalendar";
import { cn } from "@/lib/utils/cn";

type Step = "service" | "date" | "time" | "details" | "review" | "confirmation";

const STEP_ORDER: Step[] = ["service", "date", "time", "details", "review"];

const REASON_MESSAGES: Record<SlotUnavailableReason, string> = {
  PAST_DATE: "Essa data já passou.",
  TOO_SOON: "Escolha uma data com mais antecedência.",
  CLOSED: "Estamos fechados nesse dia.",
  FULLY_BOOKED: "Não há mais horários disponíveis nesse dia — tente outra data.",
};

interface BookingWizardProps {
  services: Service[];
  minAdvanceDays: number;
  preselectedServiceId?: string;
}

export function BookingWizard({ services, minAdvanceDays, preselectedServiceId }: BookingWizardProps) {
  const [step, setStep] = useState<Step>("service");
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const initialServiceId = useMemo(
    () => (preselectedServiceId && services.some((s) => s.id === preselectedServiceId) ? preselectedServiceId : ""),
    [preselectedServiceId, services]
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<BookingRequestInput>({
    resolver: zodResolver(bookingRequestSchema),
    defaultValues: {
      serviceId: initialServiceId,
      date: "",
      startTime: "",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      notes: "",
    },
  });

  const serviceId = watch("serviceId");
  const date = watch("date");
  const startTime = watch("startTime");

  const selectedService = useMemo(() => services.find((s) => s.id === serviceId) ?? null, [services, serviceId]);

  async function fetchSlots(dateStr: string, svcId: string) {
    setIsLoadingSlots(true);
    setStep("time");
    const result = await getAvailableSlotsAction(dateStr, svcId);
    setAvailability(result);
    setIsLoadingSlots(false);
  }

  function handleSelectDate(dateStr: string) {
    setValue("date", dateStr, { shouldValidate: true });
    setValue("startTime", "");
    void fetchSlots(dateStr, serviceId);
  }

  function handleSelectSlot(slotStart: string) {
    setValue("startTime", slotStart, { shouldValidate: true });
    setStep("details");
  }

  async function handleDetailsNext() {
    const valid = await trigger(["customerName", "customerPhone", "customerEmail", "notes"]);
    if (valid) setStep("review");
  }

  async function onSubmit(values: BookingRequestInput) {
    setIsSubmitting(true);
    setSubmitError(null);
    const result = await submitBookingAction(values);
    setIsSubmitting(false);

    if (result.ok) {
      setStep("confirmation");
      return;
    }

    if (result.error === "SLOT_NO_LONGER_AVAILABLE") {
      setSubmitError("Esse horário acabou de ser reservado por outra pessoa. Escolha outro horário.");
      setValue("startTime", "");
      await fetchSlots(values.date, values.serviceId);
      return;
    }

    setSubmitError(result.error);
  }

  const currentIndex = STEP_ORDER.indexOf(step);

  return (
    <div>
      {step !== "confirmation" && (
        <div className="mb-10 flex items-center justify-center gap-2">
          {STEP_ORDER.map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i <= currentIndex ? "w-8 bg-brand-forest" : "w-4 bg-brand-beige"
              )}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {step === "service" && (
            <div>
              <h2 className="mb-6 font-serif text-2xl text-brand-forest">Escolha o serviço</h2>
              {services.length === 0 ? (
                <p className="text-brand-graphite/70">
                  Nenhum serviço disponível no momento. Entre em contato pelo WhatsApp.
                </p>
              ) : (
                <div className="space-y-3">
                  {services.map((service) => {
                    const active = serviceId === service.id;
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => setValue("serviceId", service.id, { shouldValidate: true })}
                        className={cn(
                          "flex w-full items-center justify-between gap-4 rounded-2xl border p-5 text-left transition",
                          active
                            ? "border-brand-forest bg-brand-forest/5 ring-2 ring-brand-forest/20"
                            : "border-brand-beige bg-white hover:border-brand-moss/50"
                        )}
                      >
                        <div>
                          <p className="font-serif text-lg text-brand-forest">{service.name}</p>
                          <p className="mt-1 text-sm text-brand-graphite/70">
                            {formatServiceDuration(service.durationMinutes)} ·{" "}
                            {formatServicePrice(service.priceCents)}
                          </p>
                        </div>
                        {active && <Check size={20} className="shrink-0 text-brand-forest" />}
                      </button>
                    );
                  })}
                </div>
              )}
              <FieldError>{errors.serviceId?.message}</FieldError>
              <div className="mt-8">
                <Button
                  type="button"
                  disabled={!serviceId}
                  onClick={() => setStep("date")}
                  className="w-full sm:w-auto"
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === "date" && (
            <div>
              <button
                type="button"
                onClick={() => setStep("service")}
                className="mb-6 inline-flex items-center gap-1.5 text-sm text-brand-moss transition hover:text-brand-forest"
              >
                <ChevronLeft size={16} /> Voltar
              </button>
              <h2 className="mb-6 font-serif text-2xl text-brand-forest">Escolha a data</h2>
              <Card className="p-5 sm:p-6">
                <DateCalendar
                  minAdvanceDays={minAdvanceDays}
                  selectedDate={date || null}
                  onSelect={handleSelectDate}
                />
              </Card>
            </div>
          )}

          {step === "time" && (
            <div>
              <button
                type="button"
                onClick={() => setStep("date")}
                className="mb-6 inline-flex items-center gap-1.5 text-sm text-brand-moss transition hover:text-brand-forest"
              >
                <ChevronLeft size={16} /> Escolher outra data
              </button>
              <h2 className="font-serif text-2xl text-brand-forest">Escolha o horário</h2>
              {date && <p className="mt-1 text-sm text-brand-graphite/70">{formatLongDatePtBR(date)}</p>}

              {isLoadingSlots ? (
                <div className="mt-10 flex items-center justify-center gap-2 py-10 text-brand-graphite/60">
                  <Loader2 size={20} className="animate-spin" /> Buscando horários disponíveis...
                </div>
              ) : availability && availability.bookable ? (
                <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {availability.slots.map((slot) => (
                    <button
                      key={slot.startTime}
                      type="button"
                      onClick={() => handleSelectSlot(slot.startTime)}
                      className={cn(
                        "rounded-xl border border-brand-beige bg-white py-3.5 text-sm font-medium text-brand-graphite transition hover:border-brand-forest hover:bg-brand-forest/5",
                        startTime === slot.startTime && "border-brand-forest bg-brand-forest text-brand-cream hover:bg-brand-forest"
                      )}
                    >
                      {slot.startTime}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-8 rounded-2xl border border-brand-beige bg-brand-cream p-6 text-center">
                  <p className="text-brand-graphite/80">
                    {availability?.reason
                      ? REASON_MESSAGES[availability.reason]
                      : "Não há horários disponíveis para essa data."}
                  </p>
                  <Button type="button" variant="secondary" className="mt-5" onClick={() => setStep("date")}>
                    Escolher outra data
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === "details" && (
            <div>
              <button
                type="button"
                onClick={() => setStep("time")}
                className="mb-6 inline-flex items-center gap-1.5 text-sm text-brand-moss transition hover:text-brand-forest"
              >
                <ChevronLeft size={16} /> Voltar
              </button>
              <h2 className="mb-6 font-serif text-2xl text-brand-forest">Seus dados</h2>
              <div className="space-y-5">
                <div>
                  <FieldLabel htmlFor="customerName">Nome completo</FieldLabel>
                  <Input id="customerName" placeholder="Seu nome completo" {...register("customerName")} />
                  <FieldError>{errors.customerName?.message}</FieldError>
                </div>
                <div>
                  <FieldLabel htmlFor="customerPhone">WhatsApp</FieldLabel>
                  <Input id="customerPhone" placeholder="(16) 99999-9999" {...register("customerPhone")} />
                  <FieldError>{errors.customerPhone?.message}</FieldError>
                </div>
                <div>
                  <FieldLabel htmlFor="customerEmail">E-mail (opcional)</FieldLabel>
                  <Input
                    id="customerEmail"
                    type="email"
                    placeholder="seu@email.com"
                    {...register("customerEmail")}
                  />
                  <FieldError>{errors.customerEmail?.message}</FieldError>
                </div>
                <div>
                  <FieldLabel htmlFor="notes">Observação (opcional)</FieldLabel>
                  <Textarea
                    id="notes"
                    placeholder="Alguma informação que queira compartilhar?"
                    {...register("notes")}
                  />
                  <FieldError>{errors.notes?.message}</FieldError>
                </div>
              </div>
              <div className="mt-8">
                <Button type="button" className="w-full sm:w-auto" onClick={handleDetailsNext}>
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === "review" && (
            <div>
              <button
                type="button"
                onClick={() => setStep("details")}
                className="mb-6 inline-flex items-center gap-1.5 text-sm text-brand-moss transition hover:text-brand-forest"
              >
                <ChevronLeft size={16} /> Voltar
              </button>
              <h2 className="mb-6 font-serif text-2xl text-brand-forest">Revise sua solicitação</h2>

              <Card className="divide-y divide-brand-beige overflow-hidden p-0">
                <ReviewRow label="Serviço" value={selectedService?.name ?? "—"} onEdit={() => setStep("service")} />
                <ReviewRow
                  label="Data"
                  value={date ? formatLongDatePtBR(date) : "—"}
                  onEdit={() => setStep("date")}
                />
                <ReviewRow label="Horário" value={startTime || "—"} onEdit={() => setStep("time")} />
                <ReviewRow label="Nome" value={getValues("customerName") || "—"} onEdit={() => setStep("details")} />
                <ReviewRow
                  label="WhatsApp"
                  value={getValues("customerPhone") || "—"}
                  onEdit={() => setStep("details")}
                />
                {getValues("notes") ? (
                  <ReviewRow label="Observação" value={getValues("notes") || ""} onEdit={() => setStep("details")} />
                ) : null}
              </Card>

              {submitError && (
                <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{submitError}</p>
              )}

              <div className="mt-8">
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={isSubmitting}
                  onClick={handleSubmit(onSubmit)}
                >
                  {isSubmitting && <Loader2 size={18} className="mr-1 animate-spin" />}
                  Solicitar agendamento
                </Button>
              </div>
            </div>
          )}

          {step === "confirmation" && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-forest/10 text-brand-forest">
                <Check size={28} />
              </div>
              <h2 className="mx-auto mt-6 max-w-md font-serif text-2xl text-brand-forest sm:text-3xl">
                Solicitação recebida. Seu horário será confirmado pela Casa Herbert através do WhatsApp.
              </h2>

              <Card className="mx-auto mt-8 max-w-md p-6 text-left">
                <p className="text-xs font-medium uppercase tracking-wide text-brand-moss">
                  Resumo da solicitação
                </p>
                <div className="mt-3 space-y-2 text-sm text-brand-graphite">
                  <p>
                    <span className="font-medium text-brand-forest">Serviço:</span> {selectedService?.name}
                  </p>
                  <p>
                    <span className="font-medium text-brand-forest">Data:</span>{" "}
                    {date ? formatLongDatePtBR(date) : ""}
                  </p>
                  <p>
                    <span className="font-medium text-brand-forest">Horário:</span> {startTime}
                  </p>
                  <p>
                    <span className="font-medium text-brand-forest">Nome:</span> {getValues("customerName")}
                  </p>
                </div>
              </Card>

              <div className="mt-10">
                <LinkButton href="/" variant="secondary">
                  Voltar para o início
                </LinkButton>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 p-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-brand-moss">{label}</p>
        <p className="mt-1 text-sm text-brand-graphite">{value}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-xs font-medium text-brand-forest underline-offset-4 hover:underline"
      >
        Editar
      </button>
    </div>
  );
}
