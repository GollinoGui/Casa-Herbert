import { getDashboardStats } from "@/lib/data/appointments";
import { DashboardOverview } from "@/components/admin/DashboardOverview";

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();
  return <DashboardOverview stats={stats} />;
}
