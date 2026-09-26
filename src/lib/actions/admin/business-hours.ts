"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import { replaceBusinessHoursForWeekday } from "@/lib/data/business-hours";
import type { TimeRange } from "@/types";

export async function replaceBusinessHoursForWeekdayAction(weekday: number, ranges: TimeRange[]) {
  await requireAdmin();
  const result = await replaceBusinessHoursForWeekday(weekday, ranges);
  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/agenda");
  return result;
}
