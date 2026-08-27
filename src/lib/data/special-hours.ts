import { randomUUID } from "node:crypto";
import type { SpecialHours, TimeRange } from "@/types";
import { mutateDb, readDb } from "./store";

export async function getSpecialHours(): Promise<SpecialHours[]> {
  const db = readDb();
  return [...db.specialHours].sort((a, b) => a.date.localeCompare(b.date));
}

export async function upsertSpecialHours(input: {
  date: string;
  isClosed: boolean;
  reason?: string;
  ranges: TimeRange[];
}): Promise<SpecialHours> {
  return mutateDb((db) => {
    const existing = db.specialHours.find((s) => s.date === input.date);
    if (existing) {
      existing.isClosed = input.isClosed;
      existing.reason = input.reason ?? null;
      existing.ranges = input.isClosed ? [] : input.ranges;
      return existing;
    }
    const record: SpecialHours = {
      id: randomUUID(),
      date: input.date,
      isClosed: input.isClosed,
      reason: input.reason ?? null,
      ranges: input.isClosed ? [] : input.ranges,
    };
    db.specialHours.push(record);
    return record;
  });
}

export async function deleteSpecialHours(id: string): Promise<void> {
  mutateDb((db) => {
    db.specialHours = db.specialHours.filter((s) => s.id !== id);
  });
}
