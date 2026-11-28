import { z } from "zod";
import type { BusinessHourRule, PaymentMethod } from "@/types";
import { PAYMENT_METHODS } from "@/lib/finance/constants";
import { addDaysToDateStr } from "@/lib/utils/date-format";
import { monthRange } from "@/lib/utils/list-filters";

/**
 * O que aparece no Início e nos Relatórios. Guardado em settings.panel_preferences
 * (jsonb). A leitura sempre passa por parsePanelPreferences(): chave faltando,
 * antiga ou com valor estranho cai no padrão em vez de derrubar o painel.
 */

export const DASHBOARD_BLOCKS = {
  quickActions: "Botões de nova venda e comprovante",
  goal: "Meta do mês",
  balance: "Saldo em caixa",
  todayIn: "Entrou hoje",
  receivable: "A receber",
  payableDue: "Contas a vencer (7 dias)",
  nowNext: "Atendimento de agora e o próximo",
  apptToday: "Agendamentos hoje",
  apptPending: "Pendentes",
  apptConfirmed: "Confirmados",
  apptWeek: "Próximos 7 dias",
  apptMonth: "Próximos 30 dias",
  calendar: "Calendário",
  todayList: "Lista de agendamentos de hoje",
  upcomingList: "Lista de próximos agendamentos",
  reminders: "Lembretes de amanhã",
  birthdays: "Aniversariantes da semana",
  returns: "Retornos para chamar",
  lapsed: "Clientes que não voltam há um tempo",
  lowStock: "Produtos com estoque baixo",
} as const;

export const DASHBOARD_GROUPS: { title: string; keys: DashboardBlock[] }[] = [
  { title: "Atalhos", keys: ["quickActions"] },
  { title: "Meta", keys: ["goal"] },
  { title: "Cartões de dinheiro", keys: ["balance", "todayIn", "receivable", "payableDue"] },
  { title: "Cartões da agenda", keys: ["nowNext", "apptToday", "apptPending", "apptConfirmed", "apptWeek", "apptMonth"] },
  { title: "Blocos da página", keys: ["calendar", "todayList", "upcomingList"] },
  { title: "Avisos", keys: ["reminders", "returns", "birthdays", "lapsed", "lowStock"] },
];

/** Partes do Início que mudam de lugar juntas (os cartões de cada grupo andam em bloco). */
export const DASHBOARD_SECTIONS = {
  quickActions: "Atalhos",
  goal: "Meta do mês",
  finance: "Cartões de dinheiro",
  agenda: "Cartões da agenda",
  alerts: "Avisos (lembretes, aniversários, retornos, estoque)",
  calendar: "Calendário",
  lists: "Listas de agendamentos",
} as const;

export type DashboardSection = keyof typeof DASHBOARD_SECTIONS;
const SECTION_KEYS = Object.keys(DASHBOARD_SECTIONS) as DashboardSection[];

export const PAYABLE_DUE_DAYS = [3, 7, 15, 30] as const;
export const LAPSED_DAYS = [30, 45, 60, 90, 120] as const;
export const AGENDA_SLOT_MINUTES = [15, 30, 60] as const;

export const REPORT_BLOCKS = {
  tileIn: "Entrou no caixa",
  tileOut: "Saiu do caixa",
  tileResult: "Resultado",
  tileSales: "Vendas e ticket médio",
  tileServices: "Serviços realizados (número)",
  chartCash: "Gráfico de entradas x saídas",
  chartServices: "Gráfico de serviços realizados",
  chartProducts: "Gráfico de produtos vendidos",
  chartPayments: "Gráfico por forma de pagamento",
  chartHeatmap: "Mapa dos horários mais cheios",
} as const;

export const REPORT_GROUPS: { title: string; keys: ReportBlock[] }[] = [
  { title: "Números do topo", keys: ["tileIn", "tileOut", "tileResult", "tileSales", "tileServices"] },
  { title: "Gráficos", keys: ["chartCash", "chartServices", "chartProducts", "chartPayments", "chartHeatmap"] },
];

export const REPORT_PERIODS = {
  thisMonth: "Este mês",
  last7: "Últimos 7 dias",
  last30: "Últimos 30 dias",
  lastMonth: "Mês passado",
  last12Months: "Últimos 12 meses",
} as const;

export const RANKING_SIZES = [5, 8, 10, 12, 15, 20] as const;

export type DashboardBlock = keyof typeof DASHBOARD_BLOCKS;
export type ReportBlock = keyof typeof REPORT_BLOCKS;
export type ReportPeriod = keyof typeof REPORT_PERIODS;

export interface PanelPreferences {
  dashboard: Record<DashboardBlock, boolean>;
  dashboardOrder: DashboardSection[];
  reports: Record<ReportBlock, boolean>;
  rankingSize: number;
  reportPeriod: ReportPeriod;
  /** Janela do cartão "Contas a vencer". */
  payableDueDays: number;
  /** Sem atendimento concluído há pelo menos isso, entra em "não voltam há um tempo". */
  lapsedDays: number;
  /** Já vem marcada ao abrir venda, compra e pagamento (se estiver ligada). */
  defaultPaymentMethod: PaymentMethod;
  agendaSlotMinutes: number;
  /** "HH:00"; os dois vazios = usa o horário de funcionamento. */
  agendaStart: string;
  agendaEnd: string;
  /** Meta de entradas do mês no caixa; 0 = sem meta (o bloco pede para definir). */
  monthlyGoalCents: number;
}

function allOn<K extends string>(labels: Record<K, string>): Record<K, boolean> {
  return Object.fromEntries(Object.keys(labels).map((k) => [k, true])) as Record<K, boolean>;
}

export const DEFAULT_PANEL_PREFERENCES: PanelPreferences = {
  dashboard: allOn(DASHBOARD_BLOCKS),
  dashboardOrder: SECTION_KEYS,
  reports: allOn(REPORT_BLOCKS),
  rankingSize: 12,
  reportPeriod: "thisMonth",
  payableDueDays: 7,
  lapsedDays: 60,
  defaultPaymentMethod: "pix",
  agendaSlotMinutes: 30,
  agendaStart: "",
  agendaEnd: "",
  monthlyGoalCents: 0,
};

/** Mantém as seções conhecidas na ordem gravada e põe no fim as que faltarem (seção nova). */
function readOrder(raw: unknown): DashboardSection[] {
  const stored: unknown[] = Array.isArray(raw) ? raw : [];
  const known = stored.filter(
    (k, i): k is DashboardSection => SECTION_KEYS.includes(k as DashboardSection) && stored.indexOf(k) === i
  );
  return [...known, ...SECTION_KEYS.filter((k) => !known.includes(k))];
}

/** Só aproveita do valor gravado as chaves conhecidas com valor booleano. */
function readFlags<K extends string>(defaults: Record<K, boolean>, raw: unknown): Record<K, boolean> {
  const stored = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = { ...defaults };
  for (const key of Object.keys(defaults) as K[]) {
    if (typeof stored[key] === "boolean") out[key] = stored[key] as boolean;
  }
  return out;
}

const rankingSizeSchema = z.number().int().min(3).max(30);
const reportPeriodSchema = z.enum(Object.keys(REPORT_PERIODS) as [ReportPeriod, ...ReportPeriod[]]);
const oneOf = (list: readonly number[]) => z.number().int().refine((n) => list.includes(n), "Opção inválida.");
const payableDueDaysSchema = oneOf(PAYABLE_DUE_DAYS);
const lapsedDaysSchema = oneOf(LAPSED_DAYS);
const agendaSlotSchema = oneOf(AGENDA_SLOT_MINUTES);
const paymentMethodSchema = z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]]);
const goalSchema = z.number().int().min(0).max(100_000_000);
const hourSchema = z.union([z.literal(""), z.string().regex(/^([01]\d|2[0-4]):00$/, "Hora inválida.")]);

function pick<T>(schema: z.ZodType<T>, value: unknown, fallback: T): T {
  const r = schema.safeParse(value);
  return r.success ? r.data : fallback;
}

/** Mescla o que está gravado sobre os padrões. Nunca lança. */
export function parsePanelPreferences(raw: unknown): PanelPreferences {
  const stored = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const d = DEFAULT_PANEL_PREFERENCES;
  const rankingSize = rankingSizeSchema.safeParse(stored.rankingSize);
  const reportPeriod = reportPeriodSchema.safeParse(stored.reportPeriod);
  let agendaStart = pick(hourSchema, stored.agendaStart, d.agendaStart);
  let agendaEnd = pick(hourSchema, stored.agendaEnd, d.agendaEnd);
  if (!agendaStart || !agendaEnd || agendaStart >= agendaEnd) agendaStart = agendaEnd = "";
  return {
    dashboard: readFlags(d.dashboard, stored.dashboard),
    dashboardOrder: readOrder(stored.dashboardOrder),
    reports: readFlags(d.reports, stored.reports),
    rankingSize: rankingSize.success ? rankingSize.data : d.rankingSize,
    reportPeriod: reportPeriod.success ? reportPeriod.data : d.reportPeriod,
    payableDueDays: pick(payableDueDaysSchema, stored.payableDueDays, d.payableDueDays),
    lapsedDays: pick(lapsedDaysSchema, stored.lapsedDays, d.lapsedDays),
    defaultPaymentMethod: pick(paymentMethodSchema, stored.defaultPaymentMethod, d.defaultPaymentMethod),
    agendaSlotMinutes: pick(agendaSlotSchema, stored.agendaSlotMinutes, d.agendaSlotMinutes),
    agendaStart,
    agendaEnd,
    monthlyGoalCents: pick(goalSchema, stored.monthlyGoalCents, d.monthlyGoalCents),
  };
}

export interface AgendaGrid {
  slotMinutes: number;
  /** "HH:mm:ss", como o FullCalendar espera. */
  slotMinTime: string;
  slotMaxTime: string;
}

/**
 * Faixa de horas da agenda. Sem faixa escolhida, vai da primeira abertura à
 * última hora de fechamento da semana (cheia), para não rolar por horas fechadas.
 */
export function agendaGrid(prefs: PanelPreferences, hours: BusinessHourRule[]): AgendaGrid {
  let start = prefs.agendaStart;
  let end = prefs.agendaEnd;
  if (!start || !end) {
    const active = hours.filter((h) => h.isActive);
    if (active.length) {
      const first = active.reduce((m, h) => (h.startTime < m ? h.startTime : m), "23:59");
      const last = active.reduce((m, h) => (h.endTime > m ? h.endTime : m), "00:00");
      const lastHour = Number(last.slice(0, 2)) + (last.slice(3) === "00" ? 0 : 1);
      start = `${first.slice(0, 2)}:00`;
      end = `${String(Math.min(lastHour, 24)).padStart(2, "0")}:00`;
    } else {
      start = "07:00";
      end = "21:00";
    }
  }
  return { slotMinutes: prefs.agendaSlotMinutes, slotMinTime: `${start}:00`, slotMaxTime: `${end}:00` };
}

/** Período que os Relatórios abrem quando a URL não traz nenhum. */
export function reportPeriodRange(period: ReportPeriod, today: string): { dateFrom: string; dateTo: string } {
  switch (period) {
    case "last7":
      return { dateFrom: addDaysToDateStr(today, -6), dateTo: today };
    case "last30":
      return { dateFrom: addDaysToDateStr(today, -29), dateTo: today };
    case "lastMonth":
      return monthRange(addDaysToDateStr(`${today.slice(0, 7)}-01`, -1));
    case "last12Months":
      return { dateFrom: addDaysToDateStr(today, -364), dateTo: today };
    default:
      return monthRange(today);
  }
}

/** Validação estrita do que a tela de configurações envia. */
export const panelPreferencesInputSchema = z.object({
  dashboard: z.object(
    Object.fromEntries(Object.keys(DASHBOARD_BLOCKS).map((k) => [k, z.boolean()])) as Record<DashboardBlock, z.ZodBoolean>
  ),
  reports: z.object(
    Object.fromEntries(Object.keys(REPORT_BLOCKS).map((k) => [k, z.boolean()])) as Record<ReportBlock, z.ZodBoolean>
  ),
  dashboardOrder: z
    .array(z.enum(SECTION_KEYS as [DashboardSection, ...DashboardSection[]]))
    .refine((list) => new Set(list).size === list.length && list.length === SECTION_KEYS.length, "Ordem inválida."),
  rankingSize: rankingSizeSchema,
  reportPeriod: reportPeriodSchema,
  payableDueDays: payableDueDaysSchema,
  lapsedDays: lapsedDaysSchema,
  defaultPaymentMethod: paymentMethodSchema,
  agendaSlotMinutes: agendaSlotSchema,
  agendaStart: hourSchema,
  agendaEnd: hourSchema,
  monthlyGoalCents: goalSchema,
})
  .refine((p) => (p.agendaStart === "") === (p.agendaEnd === ""), "Escolha o início e o fim da agenda, ou deixe os dois automáticos.")
  .refine((p) => !p.agendaStart || p.agendaStart < p.agendaEnd, "O fim da agenda tem que ser depois do início.");
