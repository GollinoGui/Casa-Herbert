import { randomUUID } from "node:crypto";
import type { AppointmentWithRelations, BlockedSlot, BlockReason } from "@/types";
import { mutateDb, readDb } from "./store";
import { hydrateAppointment } from "./appointments";

export async function getBlockedSlots(): Promise<BlockedSlot[]> {
  const db = readDb();
  return [...db.blockedSlots].sort((a, b) => a.startDate.localeCompare(b.startDate));
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
  return mutateDb((db) => {
    const blockedSlot: BlockedSlot = {
      id: randomUUID(),
      startDate: input.startDate,
      endDate: input.endDate,
      isFullDay: input.isFullDay,
      startTime: input.isFullDay ? null : input.startTime ?? null,
      endTime: input.isFullDay ? null : input.endTime ?? null,
      reason: input.reason,
      notes: input.notes ?? null,
      createdAt: new Date().toISOString(),
    };
    db.blockedSlots.push(blockedSlot);

    const conflicting = db.appointments
      .filter((a) => {
        if (a.status !== "PENDING" && a.status !== "CONFIRMED") return false;
        if (a.date < blockedSlot.startDate || a.date > blockedSlot.endDate) return false;
        if (blockedSlot.isFullDay) return true;
        return a.startTime < (blockedSlot.endTime ?? "23:59") && a.endTime > (blockedSlot.startTime ?? "00:00");
      })
      .map((a) => hydrateAppointment(a, db))
      .filter((a): a is AppointmentWithRelations => a !== null);

    return { blockedSlot, conflicting };
  });
}

export async function deleteBlockedSlot(id: string): Promise<void> {
  mutateDb((db) => {
    db.blockedSlots = db.blockedSlots.filter((b) => b.id !== id);
  });
}
