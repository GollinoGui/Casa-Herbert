import { getDashboardStats, getTomorrowAppointments } from "@/lib/data/appointments";
import { getDashboardFinance } from "@/lib/data/financials";
import { getPanelPreferences, getSettings } from "@/lib/data/settings";
import { getBusinessHours } from "@/lib/data/business-hours";
import { getLapsedCustomers, getUpcomingBirthdays } from "@/lib/data/customers";
import { getLowStockProducts } from "@/lib/data/products";
import { agendaGrid } from "@/lib/panel/preferences";
import { DashboardOverview } from "@/components/admin/DashboardOverview";

/** Aviso que falha (ex.: migration 0015 ainda não aplicada) some do Início em vez de derrubar a página. */
async function orEmpty<T>(label: string, run: () => Promise<T>, empty: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`[inicio] ${label}:`, error instanceof Error ? error.message : error);
    return empty;
  }
}

export default async function AdminDashboardPage() {
  const prefs = await getPanelPreferences();
  const show = prefs.dashboard;
  // Aviso desligado não consulta nada.
  const [stats, finance, hours, settings, birthdays, lapsed, lowStock, tomorrow] = await Promise.all([
    getDashboardStats(),
    getDashboardFinance(prefs.payableDueDays),
    show.calendar ? getBusinessHours() : Promise.resolve([]),
    show.birthdays || show.lapsed || show.reminders ? getSettings() : Promise.resolve(null),
    show.birthdays ? orEmpty("aniversários", getUpcomingBirthdays, []) : Promise.resolve([]),
    show.lapsed ? orEmpty("clientes sumidos", () => getLapsedCustomers(prefs.lapsedDays), { total: 0, list: [] }) : Promise.resolve({ total: 0, list: [] }),
    show.lowStock ? orEmpty("estoque baixo", getLowStockProducts, []) : Promise.resolve([]),
    show.reminders ? orEmpty("lembretes", getTomorrowAppointments, []) : Promise.resolve([]),
  ]);
  return (
    <DashboardOverview
      stats={stats}
      finance={finance}
      show={show}
      order={prefs.dashboardOrder}
      payableDueDays={prefs.payableDueDays}
      lapsedDays={prefs.lapsedDays}
      grid={agendaGrid(prefs, hours)}
      templates={settings?.messageTemplates ?? null}
      birthdays={birthdays}
      lapsed={lapsed}
      lowStock={lowStock}
      tomorrow={tomorrow}
    />
  );
}
