import { addDaysToDateStr, todayDateStr } from "@/lib/utils/date-format";
import { readDb } from "./store";

export interface FinancialSummary {
  todayTotalCents: number;
  weekTotalCents: number;
  monthTotalCents: number;
  todayCount: number;
  weekCount: number;
  monthCount: number;
}

export async function getFinancialSummary(): Promise<FinancialSummary> {
  const db = readDb();
  const today = todayDateStr();
  const weekStart = addDaysToDateStr(today, -6);
  const monthStart = addDaysToDateStr(today, -29);

  let todayTotalCents = 0;
  let weekTotalCents = 0;
  let monthTotalCents = 0;
  let todayCount = 0;
  let weekCount = 0;
  let monthCount = 0;

  for (const sale of db.sales) {
    const saleDate = sale.createdAt.slice(0, 10);
    if (saleDate === today) {
      todayTotalCents += sale.totalCents;
      todayCount++;
    }
    if (saleDate >= weekStart && saleDate <= today) {
      weekTotalCents += sale.totalCents;
      weekCount++;
    }
    if (saleDate >= monthStart && saleDate <= today) {
      monthTotalCents += sale.totalCents;
      monthCount++;
    }
  }

  return { todayTotalCents, weekTotalCents, monthTotalCents, todayCount, weekCount, monthCount };
}
