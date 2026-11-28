import { getDashboardStats, getMonthScheduledCents, getTomorrowAppointments } from "@/lib/data/appointments";
import { getDashboardFinance, type DashboardFinance } from "@/lib/data/financials";
import { getPanelUser } from "@/lib/auth/require-admin";
import { getPanelPreferences, getSettings } from "@/lib/data/settings";
import { getBusinessHours } from "@/lib/data/business-hours";
import { getLapsedCustomers, getReturnDueCustomers, getUpcomingBirthdays } from "@/lib/data/customers";
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

const NO_FINANCE: DashboardFinance = {
  balanceCents: 0,
  todayInCents: 0,
  monthInCents: 0,
  monthOutCents: 0,
  receivableCents: 0,
  receivableCount: 0,
  payableDueCents: 0,
  payableDueCount: 0,
  overduePayables: 0,
};

export default async function AdminDashboardPage() {
  const [prefs, user] = await Promise.all([getPanelPreferences(), getPanelUser()]);
  const isAdmin = user?.role === "admin";
  // Secretária: sem dinheiro, meta, atalhos de venda e estoque. Desligado aqui, nem é consultado.
  const show = isAdmin
    ? prefs.dashboard
    : { ...prefs.dashboard, quickActions: false, goal: false, balance: false, todayIn: false, receivable: false, payableDue: false, lowStock: false };
  // Aviso desligado não consulta nada.
  const noReturns = { total: 0, list: [] };
  const [stats, finance, hours, settings, birthdays, lapsed, lowStock, tomorrow, returns, scheduledCents] = await Promise.all([
    getDashboardStats(),
    isAdmin ? getDashboardFinance(prefs.payableDueDays) : Promise.resolve(NO_FINANCE),
    show.calendar ? getBusinessHours() : Promise.resolve([]),
    show.birthdays || show.lapsed || show.reminders || show.returns ? getSettings() : Promise.resolve(null),
    show.birthdays ? orEmpty("aniversários", getUpcomingBirthdays, []) : Promise.resolve([]),
    show.lapsed ? orEmpty("clientes sumidos", () => getLapsedCustomers(prefs.lapsedDays), { total: 0, list: [] }) : Promise.resolve({ total: 0, list: [] }),
    show.lowStock ? orEmpty("estoque baixo", getLowStockProducts, []) : Promise.resolve([]),
    show.reminders ? orEmpty("lembretes", getTomorrowAppointments, []) : Promise.resolve([]),
    show.returns ? orEmpty("retornos", () => getReturnDueCustomers(), noReturns) : Promise.resolve(noReturns),
    show.goal && prefs.monthlyGoalCents > 0 ? orEmpty("meta", getMonthScheduledCents, 0) : Promise.resolve(0),
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
      returns={returns}
      goal={isAdmin ? { goalCents: prefs.monthlyGoalCents, scheduledCents } : { goalCents: 0, scheduledCents: 0 }}
    />
  );
}
