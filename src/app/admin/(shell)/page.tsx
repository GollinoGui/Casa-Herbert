import { getDashboardStats } from "@/lib/data/appointments";
import { getFinancialSummary } from "@/lib/data/financials";
import { DashboardOverview } from "@/components/admin/DashboardOverview";

export default async function AdminDashboardPage() {
  const [stats, financialSummary] = await Promise.all([getDashboardStats(), getFinancialSummary()]);
  return <DashboardOverview stats={stats} todayRevenueCents={financialSummary.todayTotalCents} />;
}
