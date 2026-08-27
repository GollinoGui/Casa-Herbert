"use server";

import { revalidatePath } from "next/cache";
import { replaceBusinessHoursForWeekday } from "@/lib/data/business-hours";
import type { TimeRange } from "@/types";

export async function replaceBusinessHoursForWeekdayAction(weekday: number, ranges: TimeRange[]) {
  const result = await replaceBusinessHoursForWeekday(weekday, ranges);
  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/agenda");
  return result;
}
