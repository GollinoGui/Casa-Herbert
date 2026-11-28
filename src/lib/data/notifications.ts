import { getSupabase, unwrap } from "@/lib/supabase/server";
import { addDaysToDateStr, todayDateStr } from "@/lib/utils/date-format";
import { getLowStockProducts } from "@/lib/data/products";
import { getReturnDueCustomers, getUpcomingBirthdays } from "@/lib/data/customers";
import { getPanelPreferences } from "@/lib/data/settings";
import { getWaitlistOpenings } from "@/lib/data/waitlist";
import { getCashDrawerPreview } from "@/lib/data/cash-closings";
import { listCustomerPackages } from "@/lib/data/packages";
import { getReminderQueue } from "@/lib/data/reminders";
import { nowTimeStr } from "@/lib/utils/date-format";
import type { PanelRole } from "@/lib/auth/permissions";

export type NotificationKind =
  | "pending"
  | "reminders"
  | "overdue"
  | "payables"
  | "stock"
  | "birthdays"
  | "returns"
  | "waitlist"
  | "cashClosing"
  | "packages";

export interface PanelNotification {
  kind: NotificationKind;
  /** "alerta" pede ação agora; "aviso" é lembrete. */
  tone: "alerta" | "aviso";
  title: string;
  detail: string;
  href: string;
  count: number;
}

const PACKAGE_EXPIRY_WARNING_DAYS = 15;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Um aviso que falha (ex.: migration ainda não aplicada) some da lista em vez de derrubar o sino. */
async function safe<T>(label: string, run: () => Promise<T>, empty: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`[notificacoes] ${label}:`, error instanceof Error ? error.message : error);
    return empty;
  }
}

/** Avisos que levam a páginas da secretária; os de dinheiro, estoque e pacotes nem são consultados para ela. */
const STAFF_KINDS: NotificationKind[] = ["pending", "reminders", "birthdays", "returns", "waitlist"];

export async function getPanelNotifications(role: PanelRole): Promise<PanelNotification[]> {
  if (role !== "admin") return (await getAdminOrStaffNotifications(false)).filter((n) => STAFF_KINDS.includes(n.kind));
  return getAdminOrStaffNotifications(true);
}

async function getAdminOrStaffNotifications(isAdmin: boolean): Promise<PanelNotification[]> {
  const supabase = getSupabase();
  const today = todayDateStr();
  const prefs = await safe("preferências", getPanelPreferences, null);
  const dueDays = prefs?.payableDueDays ?? 7;
  const onlyAdmin = <T,>(run: () => Promise<T>, empty: T) => (isAdmin ? run() : Promise.resolve(empty));

  const [pending, reminders, payables, lowStock, birthdays, returns, openings, drawer, packages] = await Promise.all([
    safe(
      "pedidos",
      async () =>
        (await supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "PENDING")).count ?? 0,
      0
    ),
    safe("lembretes", async () => (await getReminderQueue()).length, 0),
    onlyAdmin(
      () =>
        safe(
          "contas",
          async () =>
            unwrap(
              await supabase.from("payables").select("due_date").eq("status", "open").lte("due_date", addDaysToDateStr(today, dueDays))
            ),
          [] as { due_date: string }[]
        ),
      [] as { due_date: string }[]
    ),
    onlyAdmin(() => safe("estoque", getLowStockProducts, []), []),
    safe("aniversários", () => getUpcomingBirthdays(1), []),
    safe("retornos", async () => (await getReturnDueCustomers(0, 3)).total, 0),
    safe("lista de espera", getWaitlistOpenings, []),
    // Depois das 18h, caixa com movimento em dinheiro desde o último fechamento.
    isAdmin && nowTimeStr() >= "18:00" ? safe("fechamento", () => getCashDrawerPreview(), null) : Promise.resolve(null),
    onlyAdmin(() => safe("pacotes", () => listCustomerPackages({ status: ["active"] }), []), []),
  ]);
  // Sessão livre sem data num pacote perto de vencer se perde se ninguém marcar.
  const expiringPackages = packages.filter(
    (p) =>
      p.expiresOn !== null &&
      p.expiresOn >= today &&
      p.expiresOn <= addDaysToDateStr(today, PACKAGE_EXPIRY_WARNING_DAYS) &&
      p.sessionsTotal - p.sessionsUsed - p.sessionsScheduled > 0
  );

  const overdue = payables.filter((p) => p.due_date < today).length;
  const dueSoon = payables.length - overdue;
  const list: PanelNotification[] = [];

  if (overdue) {
    list.push({
      kind: "overdue",
      tone: "alerta",
      title: plural(overdue, "conta atrasada", "contas atrasadas"),
      detail: "Venceram e ainda não foram pagas.",
      href: "/admin/contas-a-pagar",
      count: overdue,
    });
  }
  if (pending) {
    list.push({
      kind: "pending",
      tone: "alerta",
      title: plural(pending, "pedido de horário", "pedidos de horário"),
      detail: "Esperando confirmar ou recusar.",
      href: "/admin/agendamentos?status=PENDING",
      count: pending,
    });
  }
  if (reminders) {
    list.push({
      kind: "reminders",
      tone: "aviso",
      title: plural(reminders, "mensagem para enviar", "mensagens para enviar"),
      detail: "Confirmações e lembretes de horário pelo WhatsApp.",
      href: "/admin",
      count: reminders,
    });
  }
  if (openings.length) {
    list.push({
      kind: "waitlist",
      tone: "alerta",
      title: plural(openings.length, "vaga para a lista de espera", "vagas para a lista de espera"),
      detail: openings
        .slice(0, 3)
        .map((o) => o.entry.customer.fullName)
        .join(", ") + (openings.length > 3 ? "…" : ""),
      href: "/admin/lista-de-espera",
      count: openings.length,
    });
  }
  if (returns) {
    list.push({
      kind: "returns",
      tone: "aviso",
      title: plural(returns, "retorno para chamar", "retornos para chamar"),
      detail: "Passaram do prazo de retorno do serviço e não têm nada marcado.",
      href: "/admin",
      count: returns,
    });
  }
  if (drawer && (drawer.cashInCents > 0 || drawer.cashOutCents > 0)) {
    list.push({
      kind: "cashClosing",
      tone: "aviso",
      title: "Fechar o caixa de hoje",
      detail: "Houve movimento em dinheiro desde o último fechamento.",
      href: "/admin/financeiro?aba=fechamento",
      count: 1,
    });
  }
  if (expiringPackages.length) {
    list.push({
      kind: "packages",
      tone: "aviso",
      title: plural(expiringPackages.length, "pacote perto de vencer", "pacotes perto de vencer"),
      detail:
        expiringPackages
          .slice(0, 3)
          .map((p) => p.customerName)
          .join(", ") + (expiringPackages.length > 3 ? "…" : "") + " · com sessões ainda sem data.",
      href: "/admin/pacotes",
      count: expiringPackages.length,
    });
  }
  if (dueSoon) {
    list.push({
      kind: "payables",
      tone: "aviso",
      title: plural(dueSoon, "conta vencendo", "contas vencendo"),
      detail: dueDays === 1 ? "Vencem hoje ou amanhã." : `Vencem nos próximos ${dueDays} dias.`,
      href: "/admin/contas-a-pagar",
      count: dueSoon,
    });
  }
  if (lowStock.length) {
    list.push({
      kind: "stock",
      tone: "aviso",
      title: plural(lowStock.length, "produto com estoque baixo", "produtos com estoque baixo"),
      detail: lowStock
        .slice(0, 3)
        .map((p) => p.name)
        .join(", ") + (lowStock.length > 3 ? "…" : ""),
      href: "/admin/estoque",
      count: lowStock.length,
    });
  }
  if (birthdays.length) {
    list.push({
      kind: "birthdays",
      tone: "aviso",
      title: birthdays.length === 1 ? "Aniversário hoje" : `${birthdays.length} aniversários hoje`,
      detail: birthdays
        .slice(0, 3)
        .map((b) => b.customer.fullName)
        .join(", ") + (birthdays.length > 3 ? "…" : ""),
      href: "/admin",
      count: birthdays.length,
    });
  }

  return list;
}
