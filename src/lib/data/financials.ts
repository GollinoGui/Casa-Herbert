import { addDaysToDateStr, salonDateOf, todayDateStr } from "@/lib/utils/date-format";
import { getSupabase, unwrap } from "@/lib/supabase/server";

export interface FinancialSummary {
  todayTotalCents: number;
  weekTotalCents: number;
  monthTotalCents: number;
  todayCount: number;
  weekCount: number;
  monthCount: number;
}

export async function getFinancialSummary(): Promise<FinancialSummary> {
  const today = todayDateStr();
  const weekStart = addDaysToDateStr(today, -6);
  const monthStart = addDaysToDateStr(today, -29);

  // Margem de um dia no filtro do banco: created_at é UTC, a comparação fina é no fuso do salão.
  const sales = unwrap(
    await getSupabase()
      .from("sales")
      .select("total_cents, created_at")
      .gte("created_at", addDaysToDateStr(monthStart, -1))
  );

  let todayTotalCents = 0;
  let weekTotalCents = 0;
  let monthTotalCents = 0;
  let todayCount = 0;
  let weekCount = 0;
  let monthCount = 0;

  for (const sale of sales) {
    const saleDate = salonDateOf(sale.created_at);
    const total = sale.total_cents as number;
    if (saleDate === today) {
      todayTotalCents += total;
      todayCount++;
    }
    if (saleDate >= weekStart && saleDate <= today) {
      weekTotalCents += total;
      weekCount++;
    }
    if (saleDate >= monthStart && saleDate <= today) {
      monthTotalCents += total;
      monthCount++;
    }
  }

  return { todayTotalCents, weekTotalCents, monthTotalCents, todayCount, weekCount, monthCount };
}
