"use server";

import { revalidatePath } from "next/cache";
import { upsertSpecialHours, deleteSpecialHours } from "@/lib/data/special-hours";
import type { TimeRange } from "@/types";

export async function upsertSpecialHoursAction(input: {
  date: string;
  isClosed: boolean;
  reason?: string;
  ranges: TimeRange[];
}) {
  const result = await upsertSpecialHours(input);
  revalidatePath("/admin/horarios-especiais");
  return result;
}

export async function deleteSpecialHoursAction(id: string) {
  await deleteSpecialHours(id);
  revalidatePath("/admin/horarios-especiais");
}
