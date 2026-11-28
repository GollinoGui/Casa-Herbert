import type { Appointment, Customer, Service, Settings } from "@/types";
import { formatLongDatePtBR } from "@/lib/utils/date-format";
import { toWhatsAppDigits } from "@/lib/utils/phone";
import { greetingFor } from "@/lib/reminders/rules";

function fillTemplate(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template
  );
}

export function buildAppointmentMessage(
  kind: "confirmed" | "rejected" | "cancelled" | "reminder",
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

/** Mensagem de uma regra de lembrete. A saudação sai da hora em que o botão é clicado ("HH:mm" do salão). */
export function buildReminderMessage(
  template: string,
  appointment: Pick<Appointment, "date" | "startTime">,
  customer: Pick<Customer, "fullName">,
  service: Pick<Service, "name">,
  nowTime: string
) {
  return fillTemplate(template, {
    saudacao: greetingFor(nowTime),
    nome: customer.fullName.split(" ")[0],
    servico: service.name,
    data: formatLongDatePtBR(appointment.date),
    horario: appointment.startTime,
  });
}

/** Mensagens fora de um agendamento (aniversário, convite para voltar): só o primeiro nome. */
export function buildCustomerMessage(
  template: string,
  customer: Pick<Customer, "fullName">,
  extra: Record<string, string> = {}
) {
  return fillTemplate(template, { nome: customer.fullName.split(" ")[0], ...extra });
}

/** Link wa.me com mensagem pré-preenchida, endereçado ao WhatsApp do cliente. */
export function buildWhatsAppLink(phone: string, message: string) {
  const digits = toWhatsAppDigits(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildSalonWhatsAppLink(salonNumber: string, message: string) {
  return `https://wa.me/${toWhatsAppDigits(salonNumber)}?text=${encodeURIComponent(message)}`;
}
