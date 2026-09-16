"use client";

import { useEffect, useState } from "react";
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
import type { Customer, Service } from "@/types";

type FormValues = z.infer<typeof adminAppointmentFormSchema>;

const EMPTY_VALUES = (date: string, startTime: string): FormValues => ({
  customerMode: "existing",
  customerId: "",
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
}

export function NewAppointmentModal({
  open,
  onClose,
  onCreated,
  initialDate,
  initialStartTime,
}: NewAppointmentModalProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
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
    reset(EMPTY_VALUES(initialDate ?? "", initialStartTime ?? ""));
  }, [open, initialDate, initialStartTime, reset]);

  const customerMode = watch("customerMode");
  const serviceId = watch("serviceId");

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
              <Select {...register("customerId")}>
                <option value="">Selecione...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} — {c.phone}
                  </option>
                ))}
              </Select>
              <FieldError>{errors.customerId?.message}</FieldError>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Input placeholder="Nome completo" {...register("newCustomerName")} />
                <FieldError>{errors.newCustomerName?.message}</FieldError>
              </div>
              <div>
                <Input placeholder="WhatsApp com DDD" {...register("newCustomerPhone")} />
                <FieldError>{errors.newCustomerPhone?.message}</FieldError>
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
