"use server";

import type { BookingRequestInput } from "@/lib/booking/validators";
import { getAvailableSlotsForService, createAppointment, findNextAvailableDate } from "@/lib/data/availability";
import { addDaysToDateStr } from "@/lib/utils/date-format";

/** Server Action chamada pelo BookingWizard (client) para buscar horários disponíveis. */
export async function getAvailableSlotsAction(dateStr: string, serviceId: string) {
  return getAvailableSlotsForService(dateStr, serviceId);
}

/** Sugestão de UX para quando a data escolhida não tem horário: procura a próxima data livre a partir do dia seguinte. */
export async function getNextAvailableDateAction(dateStr: string, serviceId: string) {
  return findNextAvailableDate(addDaysToDateStr(dateStr, 1), serviceId);
}

/** Server Action chamada pelo BookingWizard (client) para solicitar o agendamento. Revalida tudo no servidor. */
export async function submitBookingAction(input: BookingRequestInput) {
  return createAppointment(input);
}
