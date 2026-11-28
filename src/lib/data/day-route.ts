import type { AppointmentWithRelations } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";
import { listAppointments } from "@/lib/data/appointments";

export interface DayRouteItem {
  appointment: AppointmentWithRelations;
  /** "Sessão 3 de 6" quando o atendimento é de pacote. */
  packageLabel: string | null;
}

/** Atendimentos ainda marcados do dia, com a posição de cada sessão no pacote. */
export async function getDayRoute(date: string): Promise<DayRouteItem[]> {
  const appointments = await listAppointments({ status: ["PENDING", "CONFIRMED"], dateFrom: date, dateTo: date });
  const packageIds = [...new Set(appointments.map((a) => a.customerPackageId).filter((id): id is string => !!id))];
  if (!packageIds.length) return appointments.map((appointment) => ({ appointment, packageLabel: null }));

  const supabase = getSupabase();
  const [packages, sessions] = await Promise.all([
    supabase.from("customer_packages").select("id, sessions_total").in("id", packageIds).then(unwrap),
    supabase
      .from("appointments")
      .select("id, customer_package_id, appointment_date, start_time, status, package_outcome")
      .in("customer_package_id", packageIds)
      .then(unwrap),
  ]);
  const totals = new Map(packages.map((p) => [p.id as string, p.sessions_total as number]));

  // Conta só o que ocupa uma vaga do pacote: sessão que voltou para o pacote não conta.
  const position = (a: AppointmentWithRelations) =>
    sessions.filter(
      (s) =>
        s.customer_package_id === a.customerPackageId &&
        s.status !== "REJECTED" &&
        !(s.status === "CANCELLED" && s.package_outcome !== "counted") &&
        `${s.appointment_date} ${String(s.start_time).slice(0, 5)}` <= `${a.date} ${a.startTime}`
    ).length;

  return appointments.map((appointment) => {
    const total = appointment.customerPackageId ? totals.get(appointment.customerPackageId) : undefined;
    return {
      appointment,
      packageLabel: total ? `Sessão ${position(appointment)} de ${total}` : null,
    };
  });
}
