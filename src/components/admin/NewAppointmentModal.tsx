"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea, FieldLabel, FieldError } from "@/components/ui/Field";
import { adminAppointmentFormSchema } from "@/lib/booking/validators";
import { adminCreateAppointmentAction } from "@/lib/actions/admin/appointments";
import { listActiveServicesAction } from "@/lib/actions/admin/services";
import { listCustomersAction } from "@/lib/actions/admin/customers";
import { canonicalPhone, formatPhoneDisplay } from "@/lib/utils/phone";
import { matchesCustomerSearch } from "@/lib/utils/customer-search";
import type { Customer, Service } from "@/types";

type FormValues = z.infer<typeof adminAppointmentFormSchema>;

const EMPTY_VALUES = (date: string, startTime: string, customerId = ""): FormValues => ({
  customerMode: "existing",
  customerId,
  newCustomerName: "",
  newCustomerPhone: "",
  newCustomerEmail: "",
  serviceId: "",
  date,
  startTime,
  priceCents: null,
  adminNotes: "",
  status: "CONFIRMED",
});

interface NewAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialDate?: string;
  initialStartTime?: string;
  /** Já abre com este cliente selecionado (ex.: botão "Agendar" na ficha do cliente). */
  initialCustomerId?: string;
}

export function NewAppointmentModal({
  open,
  onClose,
  onCreated,
  initialDate,
  initialStartTime,
  initialCustomerId,
}: NewAppointmentModalProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(adminAppointmentFormSchema),
    defaultValues: EMPTY_VALUES(initialDate ?? "", initialStartTime ?? ""),
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    Promise.all([listActiveServicesAction(), listCustomersAction()]).then(([svc, cust]) => {
      setServices(svc);
      setCustomers(cust);
    });
    setCustomerQuery("");
    reset(EMPTY_VALUES(initialDate ?? "", initialStartTime ?? "", initialCustomerId));
  }, [open, initialDate, initialStartTime, initialCustomerId, reset]);

  const customerMode = watch("customerMode");
  const customerId = watch("customerId");
  const serviceId = watch("serviceId");
  const newCustomerPhone = watch("newCustomerPhone") ?? "";

  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;
  const customerMatches = useMemo(
    () => customers.filter((c) => matchesCustomerSearch(c, customerQuery)).slice(0, 8),
    [customers, customerQuery]
  );
  // O servidor liga ao cadastro existente de qualquer forma (findOrCreateCustomer);
  // o aviso só evita a surpresa de o nome digitado aqui não ser usado.
  const existingForNewPhone = useMemo(() => {
    const phone = canonicalPhone(newCustomerPhone);
    return phone.length >= 10 ? customers.find((c) => c.normalizedPhone === phone) ?? null : null;
  }, [customers, newCustomerPhone]);

  function pickCustomer(customer: Customer) {
    setValue("customerMode", "existing");
    setValue("customerId", customer.id, { shouldValidate: true });
    setCustomerQuery("");
  }

  function handleServiceChange(id: string) {
    setValue("serviceId", id, { shouldValidate: true });
    const service = services.find((s) => s.id === id);
    if (service) {
      setValue("priceCents", service.priceCents);
    }
  }

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    const result = await adminCreateAppointmentAction({
      serviceId: values.serviceId,
      date: values.date,
      startTime: values.startTime,
      priceCentsOverride: values.priceCents ?? null,
      customerId: values.customerMode === "existing" ? values.customerId : undefined,
      newCustomer:
        values.customerMode === "new"
          ? {
              fullName: values.newCustomerName!,
              phone: values.newCustomerPhone!,
              email: values.newCustomerEmail || null,
            }
          : undefined,
      adminNotes: values.adminNotes || null,
      status: values.status,
    });

    if (!result.ok) {
      setSubmitError(
        result.error === "SLOT_NO_LONGER_AVAILABLE"
          ? "Esse horário não está mais disponível. Escolha outro."
          : result.error
      );
      return;
    }
    onCreated();
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo agendamento" widthClassName="max-w-xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <FieldLabel>Cliente</FieldLabel>
          <div className="mb-2 flex gap-4 text-sm text-brand-graphite">
            <label className="flex items-center gap-1.5">
              <input type="radio" value="existing" {...register("customerMode")} /> Cliente existente
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" value="new" {...register("customerMode")} /> Novo cliente
            </label>
          </div>
          {customerMode === "existing" ? (
            <div>
              {selectedCustomer ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-moss/40 bg-brand-cream/50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-brand-graphite">{selectedCustomer.fullName}</p>
                    <p className="text-xs text-brand-graphite/60">{formatPhoneDisplay(selectedCustomer.phone)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValue("customerId", "")}
                    className="shrink-0 text-xs font-medium text-brand-moss hover:underline"
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search
                      size={15}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-graphite/40"
                    />
                    <Input
                      value={customerQuery}
                      onChange={(e) => setCustomerQuery(e.target.value)}
                      placeholder="Buscar por nome ou telefone"
                      aria-label="Buscar cliente"
                      className="pl-9"
                    />
                  </div>
                  <ul className="mt-2 max-h-52 overflow-y-auto overscroll-contain rounded-xl border border-brand-beige">
                    {customerMatches.length === 0 ? (
                      <li className="px-4 py-3 text-sm text-brand-graphite/50">
                        {customers.length === 0 ? "Nenhum cliente cadastrado." : "Nenhum cliente encontrado."}
                      </li>
                    ) : (
                      customerMatches.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => pickCustomer(c)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-brand-cream"
                          >
                            <span className="truncate font-medium text-brand-graphite">{c.fullName}</span>
                            <span className="shrink-0 text-xs text-brand-graphite/60">{formatPhoneDisplay(c.phone)}</span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
              <FieldError>{errors.customerId?.message}</FieldError>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Input placeholder="Nome completo" {...register("newCustomerName")} />
                <FieldError>{errors.newCustomerName?.message}</FieldError>
              </div>
              <div>
                <Input placeholder="WhatsApp com DDD" inputMode="tel" {...register("newCustomerPhone")} />
                <FieldError>{errors.newCustomerPhone?.message}</FieldError>
                {existingForNewPhone ? (
                  <div className="mt-2 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-3 text-sm text-brand-graphite">
                    <p>
                      Esse telefone já é de <strong>{existingForNewPhone.fullName}</strong>. O agendamento vai para
                      esse cadastro.
                    </p>
                    <button
                      type="button"
                      onClick={() => pickCustomer(existingForNewPhone)}
                      className="mt-1.5 text-xs font-medium text-brand-moss hover:underline"
                    >
                      Usar cadastro de {existingForNewPhone.fullName}
                    </button>
                  </div>
                ) : null}
              </div>
              <div>
                <Input placeholder="E-mail (opcional)" {...register("newCustomerEmail")} />
              </div>
            </div>
          )}
        </div>

        <div>
          <FieldLabel htmlFor="serviceId">Serviço</FieldLabel>
          <Select id="serviceId" value={serviceId} onChange={(e) => handleServiceChange(e.target.value)}>
            <option value="">Selecione...</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.durationMinutes} min)
              </option>
            ))}
          </Select>
          <FieldError>{errors.serviceId?.message}</FieldError>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="date">Data</FieldLabel>
            <Input id="date" type="date" {...register("date")} />
            <FieldError>{errors.date?.message}</FieldError>
          </div>
          <div>
            <FieldLabel htmlFor="startTime">Horário</FieldLabel>
            <Input id="startTime" type="time" {...register("startTime")} />
            <FieldError>{errors.startTime?.message}</FieldError>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="priceCents">Valor combinado (centavos)</FieldLabel>
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
          <div>
            <FieldLabel htmlFor="status">Status inicial</FieldLabel>
            <Select id="status" {...register("status")}>
              <option value="CONFIRMED">Confirmado</option>
              <option value="PENDING">Pendente</option>
            </Select>
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="adminNotes">Observações internas (opcional)</FieldLabel>
          <Textarea id="adminNotes" rows={2} {...register("adminNotes")} />
        </div>

        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Criando..." : "Criar agendamento"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
