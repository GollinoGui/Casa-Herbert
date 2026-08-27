"use server";

import type { BookingRequestInput } from "@/lib/booking/validators";
import { getAvailableSlotsForService, createAppointment } from "@/lib/data/availability";

/** Server Action chamada pelo BookingWizard (client) para buscar horários disponíveis. */
export async function getAvailableSlotsAction(dateStr: string, serviceId: string) {
  return getAvailableSlotsForService(dateStr, serviceId);
}

/** Server Action chamada pelo BookingWizard (client) para solicitar o agendamento. Revalida tudo no servidor. */
export async function submitBookingAction(input: BookingRequestInput) {
  return createAppointment(input);
}
