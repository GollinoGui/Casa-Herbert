"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FieldLabel, FieldError } from "@/components/ui/Field";
import { settingsFormSchema } from "@/lib/booking/validators";
import { updateSettingsAction } from "@/lib/actions/admin/settings";
import { BusinessHoursEditor } from "@/components/admin/BusinessHoursEditor";
import type { BusinessHourRule, Settings } from "@/types";

type GeneralFormValues = z.infer<typeof settingsFormSchema>;

export function SettingsManager({
  settings,
  businessHours,
}: {
  settings: Settings;
  businessHours: BusinessHourRule[];
}) {
  return (
    <div className="space-y-8">
      <GeneralSettingsForm settings={settings} />

      <Card className="p-5 sm:p-6">
        <h2 className="mb-1 font-serif text-xl text-brand-forest">Horário de funcionamento semanal</h2>
        <p className="mb-5 text-sm text-brand-graphite/60">
          Alterações são aplicadas imediatamente. Agendamentos futuros que ficarem fora do novo horário são
          listados como aviso — nada é cancelado automaticamente.
        </p>
        <BusinessHoursEditor businessHours={businessHours} />
      </Card>

      <MessageTemplatesForm settings={settings} />
    </div>
  );
}

function GeneralSettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GeneralFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      minAdvanceDays: settings.minAdvanceDays,
      bufferMinutes: settings.bufferMinutes,
      slotStepMinutes: settings.slotStepMinutes,
      pendingExpiryHours: settings.pendingExpiryHours,
      defaultDurationMinutes: settings.defaultDurationMinutes,
      whatsappNumber: settings.whatsappNumber,
      salonAddress: settings.salonAddress,
    },
  });

  async function onSubmit(values: GeneralFormValues) {
    await updateSettingsAction(values);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-5 font-serif text-xl text-brand-forest">Dados de contato e regras de agendamento</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="whatsappNumber">WhatsApp (com DDI e DDD)</FieldLabel>
            <Input id="whatsappNumber" {...register("whatsappNumber")} />
            <FieldError>{errors.whatsappNumber?.message}</FieldError>
          </div>
          <div>
            <FieldLabel htmlFor="salonAddress">Endereço</FieldLabel>
            <Input id="salonAddress" {...register("salonAddress")} />
            <FieldError>{errors.salonAddress?.message}</FieldError>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <FieldLabel htmlFor="minAdvanceDays">Antecedência mínima (dias)</FieldLabel>
            <Input id="minAdvanceDays" type="number" {...register("minAdvanceDays")} />
            <p className="mt-1 text-xs text-brand-graphite/50">
              Quantos dias de antecedência mínima são exigidos para agendar (0 = permite mesmo dia).
            </p>
            <FieldError>{errors.minAdvanceDays?.message}</FieldError>
          </div>
          <div>
            <FieldLabel htmlFor="bufferMinutes">Intervalo entre atendimentos (min)</FieldLabel>
            <Input id="bufferMinutes" type="number" {...register("bufferMinutes")} />
            <FieldError>{errors.bufferMinutes?.message}</FieldError>
          </div>
          <div>
            <FieldLabel htmlFor="slotStepMinutes">Intervalo dos horários (min)</FieldLabel>
            <Input id="slotStepMinutes" type="number" {...register("slotStepMinutes")} />
            <FieldError>{errors.slotStepMinutes?.message}</FieldError>
          </div>
          <div>
            <FieldLabel htmlFor="pendingExpiryHours">Expiração de pendentes (horas)</FieldLabel>
            <Input id="pendingExpiryHours" type="number" {...register("pendingExpiryHours")} />
            <FieldError>{errors.pendingExpiryHours?.message}</FieldError>
          </div>
          <div>
            <FieldLabel htmlFor="defaultDurationMinutes">Duração padrão (min)</FieldLabel>
            <Input id="defaultDurationMinutes" type="number" {...register("defaultDurationMinutes")} />
            <FieldError>{errors.defaultDurationMinutes?.message}</FieldError>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar alterações"}
          </Button>
          {saved ? <span className="text-sm text-brand-moss">Configurações salvas.</span> : null}
        </div>
      </form>
    </Card>
  );
}

function MessageTemplatesForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(settings.messageTemplates.confirmed);
  const [rejected, setRejected] = useState(settings.messageTemplates.rejected);
  const [cancelled, setCancelled] = useState(settings.messageTemplates.cancelled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    await updateSettingsAction({ messageTemplates: { confirmed, rejected, cancelled } });
    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-1 font-serif text-xl text-brand-forest">Modelos de mensagem do WhatsApp</h2>
      <p className="mb-5 text-sm text-brand-graphite/60">
        Use os placeholders <code className="rounded bg-brand-cream px-1">{"{nome}"}</code>,{" "}
        <code className="rounded bg-brand-cream px-1">{"{servico}"}</code>,{" "}
        <code className="rounded bg-brand-cream px-1">{"{data}"}</code> e{" "}
        <code className="rounded bg-brand-cream px-1">{"{horario}"}</code> — eles são substituídos automaticamente
        ao enviar.
      </p>
      <div className="space-y-4">
        <div>
          <FieldLabel htmlFor="tpl-confirmed">Confirmação</FieldLabel>
          <Textarea id="tpl-confirmed" rows={5} value={confirmed} onChange={(e) => setConfirmed(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="tpl-rejected">Recusa</FieldLabel>
          <Textarea id="tpl-rejected" rows={5} value={rejected} onChange={(e) => setRejected(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="tpl-cancelled">Cancelamento</FieldLabel>
          <Textarea id="tpl-cancelled" rows={5} value={cancelled} onChange={(e) => setCancelled(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar modelos"}
        </Button>
        {saved ? <span className="text-sm text-brand-moss">Modelos salvos.</span> : null}
      </div>
    </Card>
  );
}
