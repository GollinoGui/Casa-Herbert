import type { Appointment, Customer, Service, Settings } from "@/types";
import { formatLongDatePtBR } from "@/lib/utils/date-format";
import { toWhatsAppDigits } from "@/lib/utils/phone";

function fillTemplate(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template
  );
}

export function buildAppointmentMessage(
  kind: "confirmed" | "rejected" | "cancelled",
  appointment: Appointment,
  customer: Customer,
  service: Service,
  templates: Settings["messageTemplates"]
) {
  return fillTemplate(templates[kind], {
    nome: customer.fullName.split(" ")[0],
    servico: service.name,
    data: formatLongDatePtBR(appointment.date),
    horario: appointment.startTime,
  });
}

/** Link wa.me com mensagem pré-preenchida, endereçado ao WhatsApp do cliente. */
export function buildWhatsAppLink(phone: string, message: string) {
  const digits = toWhatsAppDigits(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildSalonWhatsAppLink(salonNumber: string, message: string) {
  return `https://wa.me/${toWhatsAppDigits(salonNumber)}?text=${encodeURIComponent(message)}`;
}
