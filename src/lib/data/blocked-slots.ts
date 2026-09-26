import type { AppointmentWithRelations, BlockedSlot, BlockReason } from "@/types";
import { getSupabase, unwrap } from "@/lib/supabase/server";
import { APPOINTMENT_WITH_RELATIONS, toAppointmentWithRelations, toBlockedSlot } from "@/lib/supabase/mappers";

export async function getBlockedSlots(): Promise<BlockedSlot[]> {
  const rows = unwrap(await getSupabase().from("blocked_slots").select("*").order("start_date"));
  return rows.map(toBlockedSlot);
}

export interface CreateBlockedSlotInput {
  startDate: string;
  endDate: string;
  isFullDay: boolean;
  startTime?: string;
  endTime?: string;
  reason: BlockReason;
  notes?: string;
}

/**
 * Cria o bloqueio e retorna os agendamentos PENDING/CONFIRMED que ficam
 * dentro do período — não cancela nada automaticamente (ação humana, o admin
 * decide o que fazer). Ver documentação.md > Casos de conflito.
 */
export async function createBlockedSlot(
  input: CreateBlockedSlotInput
): Promise<{ blockedSlot: BlockedSlot; conflicting: AppointmentWithRelations[] }> {
  const supabase = getSupabase();
  const row = unwrap(
    await supabase
      .from("blocked_slots")
      .insert({
        start_date: input.startDate,
        end_date: input.endDate,
        is_full_day: input.isFullDay,
        start_time: input.isFullDay ? null : input.startTime ?? null,
        end_time: input.isFullDay ? null : input.endTime ?? null,
        reason: input.reason,
        notes: input.notes ?? null,
      })
      .select("*")
      .single()
  );
  const blockedSlot = toBlockedSlot(row);

  const inPeriod = unwrap(
    await supabase
      .from("appointments")
      .select(APPOINTMENT_WITH_RELATIONS)
      .gte("appointment_date", blockedSlot.startDate)
      .lte("appointment_date", blockedSlot.endDate)
      .in("status", ["PENDING", "CONFIRMED"])
  ).map(toAppointmentWithRelations);

  const conflicting = inPeriod.filter(
    (a) =>
      blockedSlot.isFullDay ||
      (a.startTime < (blockedSlot.endTime ?? "23:59") && a.endTime > (blockedSlot.startTime ?? "00:00"))
  );

  return { blockedSlot, conflicting };
}

export async function deleteBlockedSlot(id: string): Promise<void> {
  unwrap(await getSupabase().from("blocked_slots").delete().eq("id", id));
}
