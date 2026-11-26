"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  BellRing,
  CakeSlice,
  Check,
  CalendarDays,
  CheckCircle2,
  Clock,
  CalendarRange,
  MessageCircle,
  MoonStar,
  Package,
  Plus,
  ReceiptText,
  Settings2,
  Sun,
  Sunrise,
  Target,
  Undo2,
  UserRoundSearch,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { CountUp } from "@/components/admin/CountUp";
import { EmptyState } from "@/components/admin/EmptyState";
import { BotanicalBranch } from "@/components/admin/BotanicalBranch";
import { cn } from "@/lib/utils/cn";
import { AppointmentDetailModal } from "@/components/admin/AppointmentDetailModal";
import { CalendarView } from "@/components/admin/CalendarView";
import { SaleModal } from "@/components/admin/SaleModal";
import { ReceiptSaleModal } from "@/components/admin/ReceiptSaleModal";
import { Button } from "@/components/ui/Button";
import { formatBRL } from "@/lib/utils/money";
import type { DashboardFinance } from "@/lib/data/financials";
import { formatChipDatePtBR, formatLongDatePtBR, formatShortDatePtBR, nowTimeStr, todayDateStr } from "@/lib/utils/date-format";
import { buildAppointmentMessage, buildCustomerMessage, buildWhatsAppLink } from "@/lib/booking/whatsapp";
import { setReminderSentAction } from "@/lib/actions/admin/appointments";
import type { AppointmentWithRelations, Customer, Product, Settings } from "@/types";
import type { AgendaGrid, DashboardBlock, DashboardSection } from "@/lib/panel/preferences";
import type { LapsedCustomer, ReturnDueCustomer, UpcomingBirthday } from "@/lib/data/customers";

interface DashboardStats {
  todayCount: number;
  pendingCount: number;
  confirmedCount: number;
  weekCount: number;
  monthCount: number;
  upcoming: AppointmentWithRelations[];
  todayAppointments: AppointmentWithRelations[];
}

export function DashboardOverview({
  stats,
  finance,
  show,
  order,
  payableDueDays,
  lapsedDays,
  grid,
  templates,
  birthdays,
  lapsed,
  lowStock,
  tomorrow,
  returns,
  goal,
}: {
  stats: DashboardStats;
  finance: DashboardFinance;
  /** O que o Herbert escolheu ver, em Configurações > Painel e gráficos. */
  show: Record<DashboardBlock, boolean>;
  order: DashboardSection[];
  payableDueDays: number;
  lapsedDays: number;
  grid: AgendaGrid;
  templates: Settings["messageTemplates"] | null;
  birthdays: UpcomingBirthday[];
  lapsed: { total: number; list: LapsedCustomer[] };
  lowStock: Product[];
  tomorrow: AppointmentWithRelations[];
  returns: { total: number; list: ReturnDueCustomer[] };
  goal: { goalCents: number; scheduledCents: number };
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const statCards = [
    { key: "apptToday", label: "Hoje", value: stats.todayCount, icon: CalendarDays },
    { key: "apptPending", label: "Pendentes", value: stats.pendingCount, icon: Clock },
    { key: "apptConfirmed", label: "Confirmados", value: stats.confirmedCount, icon: CheckCircle2 },
    { key: "apptWeek", label: "Próximos 7 dias", value: stats.weekCount, icon: CalendarRange },
    { key: "apptMonth", label: "Próximos 30 dias", value: stats.monthCount, icon: Users },
  ].filter((c) => show[c.key as DashboardBlock]);

  const financeCards = [
    { key: "balance", label: "Saldo em caixa", cents: finance.balanceCents, hint: "ver extrato", href: "/admin/financeiro" },
    { key: "todayIn", label: "Entrou hoje", cents: finance.todayInCents, hint: `no mês: ${formatBRL(finance.monthInCents)}`, href: "/admin/relatorios" },
    {
      key: "receivable",
      label: "A receber",
      cents: finance.receivableCents,
      hint: `${finance.receivableCount} pendência(s)`,
      href: "/admin/contas-a-receber",
    },
    {
      key: "payableDue",
      label: `Contas a vencer (${payableDueDays} dias)`,
      cents: finance.payableDueCents,
      hint: finance.overduePayables ? `${finance.overduePayables} atrasada(s)` : `${finance.payableDueCount} conta(s)`,
      href: "/admin/contas-a-pagar",
      alert: finance.overduePayables > 0,
    },
  ].filter((c) => show[c.key as DashboardBlock]);
  const showLists = show.todayList || show.upcomingList;
  const showAlerts = show.reminders || show.returns || show.birthdays || show.lapsed || show.lowStock;

  function openAppointment(id: string) {
    setSelectedId(id);
    setOpen(true);
  }

  const today = todayDateStr();
  const hour = Number(nowTimeStr().slice(0, 2));
  const greeting = hour >= 5 && hour < 12 ? "Bom dia" : hour >= 12 && hour < 18 ? "Boa tarde" : "Boa noite";
  const GreetingIcon = hour >= 5 && hour < 12 ? Sunrise : hour >= 12 && hour < 18 ? Sun : MoonStar;

  const sections: Record<DashboardSection, ReactNode> = {
    quickActions: show.quickActions ? (
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setSaleOpen(true)}>
          <Plus size={16} /> Nova venda
        </Button>
        <Button variant="secondary" onClick={() => setReceiptOpen(true)}>
          <ReceiptText size={16} /> Registrar pelo comprovante
        </Button>
      </div>
    ) : null,

    goal: show.goal ? <GoalCard goal={goal} monthInCents={finance.monthInCents} /> : null,

    finance: financeCards.length ? (
      // Celular: carrossel com encaixe (o próximo cartão aparece na borda); tela maior: grade.
      <div
        data-cascata
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4 [&::-webkit-scrollbar]:hidden"
      >
        {financeCards.map((c, i) => (
          <Link
            key={c.label}
            href={c.href}
            className={cn(
              "cartao-vivo group relative min-w-[74%] snap-start overflow-hidden rounded-[22px] border p-5 shadow-softer sm:min-w-0",
              i === 0
                ? "border-transparent bg-gradient-to-br from-brand-pine to-brand-pineSoft text-brand-onPine"
                : "border-brand-beige bg-white"
            )}
          >
            {i === 0 ? (
              <BotanicalBranch className="pointer-events-none absolute -right-4 -top-3 h-28 w-24 rotate-12 text-brand-onPine/10" />
            ) : null}
            <p className={cn("relative flex items-center gap-1.5 text-xs font-medium", i === 0 ? "text-brand-onPine/70" : "text-brand-graphite/60")}>
              {c.alert ? <AlertCircle size={13} className="text-red-700" /> : null}
              {c.label}
            </p>
            <p
              className={cn(
                "valor-sensivel relative mt-2 truncate text-2xl font-semibold tabular-nums tracking-tight",
                i === 0 ? "text-brand-onPine" : "text-brand-graphite"
              )}
            >
              <CountUp value={c.cents} format={(n) => formatBRL(Math.round(n))} />
            </p>
            <p
              className={cn(
                "relative mt-1 flex items-center gap-1 text-xs",
                c.hint.includes("R$") && "valor-sensivel",
                c.alert ? "font-medium text-red-700" : i === 0 ? "text-brand-onPine/60" : "text-brand-graphite/50"
              )}
            >
              {c.hint}
              <ArrowUpRight size={12} className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
            </p>
          </Link>
        ))}
      </div>
    ) : null,

    agenda: statCards.length ? (
      <div data-cascata className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
        {statCards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="cartao-vivo p-4 sm:p-5">
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-sage/20 text-brand-moss">
              <Icon size={18} strokeWidth={1.75} />
            </span>
            <p className="truncate text-2xl font-semibold tabular-nums text-brand-forest">
              <CountUp value={value} duration={0.8} />
            </p>
            <p className="text-xs text-brand-graphite/70">{label}</p>
          </Card>
        ))}
      </div>
    ) : null,

    alerts: showAlerts ? (
      <div data-cascata className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {show.reminders ? <RemindersCard appointments={tomorrow} templates={templates} /> : null}
        {show.returns ? <ReturnsCard returns={returns} template={templates?.returnDue ?? ""} /> : null}
        {show.birthdays ? <BirthdaysCard birthdays={birthdays} template={templates?.birthday ?? ""} today={today} /> : null}
        {show.lapsed ? <LapsedCard lapsed={lapsed} lapsedDays={lapsedDays} template={templates?.comeback ?? ""} /> : null}
        {show.lowStock ? <LowStockCard products={lowStock} /> : null}
      </div>
    ) : null,

    calendar: show.calendar ? (
      <div>
        <h2 className="mb-4 font-serif text-xl text-brand-forest">Calendário</h2>
        <CalendarView grid={grid} />
      </div>
    ) : null,

    lists: showLists ? (
      <div className={show.todayList && show.upcomingList ? "grid grid-cols-1 gap-6 lg:grid-cols-2" : "grid grid-cols-1 gap-6"}>
        {show.todayList ? (
          <Card className="p-5">
            <h2 className="mb-4 font-serif text-xl text-brand-forest">Agendamentos de hoje</h2>
            {stats.todayAppointments.length === 0 ? (
              <EmptyState compact title="Agenda livre hoje" hint="Bom momento para cuidar do estoque ou das contas." />
            ) : (
              <ul data-cascata className="space-y-2">
                {stats.todayAppointments.map((a) => (
                  <AppointmentRow key={a.id} appointment={a} onClick={() => openAppointment(a.id)} />
                ))}
              </ul>
            )}
          </Card>
        ) : null}

        {show.upcomingList ? (
          <Card className="p-5">
            <h2 className="mb-4 font-serif text-xl text-brand-forest">Próximos agendamentos</h2>
            {stats.upcoming.length === 0 ? (
              <EmptyState compact title="Nada marcado por enquanto" hint="Os próximos agendamentos aparecem aqui." />
            ) : (
              <ul data-cascata className="space-y-2">
                {stats.upcoming.map((a) => (
                  <AppointmentRow key={a.id} appointment={a} showDate onClick={() => openAppointment(a.id)} />
                ))}
              </ul>
            )}
          </Card>
        ) : null}
      </div>
    ) : null,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow mb-2 inline-flex items-center gap-1.5">
            <GreetingIcon size={13} className="shrink-0" aria-hidden="true" />
            {formatLongDatePtBR(today)}
          </p>
          <h1 className="font-serif text-[1.9rem] leading-tight tracking-[-0.01em] text-brand-forest sm:text-4xl">
            {greeting}
            <span className="text-brand-moss">.</span>
          </h1>
          <p className="mt-1 text-sm text-brand-graphite/60">
            {stats.todayCount === 0
              ? "Nenhum atendimento marcado para hoje."
              : `${stats.todayCount} atendimento(s) hoje${stats.pendingCount ? ` · ${stats.pendingCount} aguardando confirmação` : ""}.`}
          </p>
        </div>
        <Link
          href="/admin/configuracoes?aba=painel"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-brand-moss transition hover:bg-brand-sage/15"
        >
          <Settings2 size={15} aria-hidden="true" /> Escolher o que aparece aqui
        </Link>
      </div>

      {order.map((key) => (sections[key] ? <div key={key}>{sections[key]}</div> : null))}

      <AppointmentDetailModal
        appointmentId={selectedId}
        open={open}
        onClose={() => setOpen(false)}
        onMutated={() => router.refresh()}
      />
      <SaleModal
        open={saleOpen}
        onClose={() => setSaleOpen(false)}
        onCompleted={() => {
          setSaleOpen(false);
          router.refresh();
        }}
      />
      <ReceiptSaleModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        onCompleted={() => {
          setReceiptOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function AlertCard({
  icon: Icon,
  title,
  count,
  children,
  footer,
}: {
  icon: typeof CakeSlice;
  title: string;
  count?: number;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card className="flex flex-col p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-sage/20 text-brand-moss">
          <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h2 className="min-w-0 flex-1 font-serif text-lg leading-tight text-brand-forest">{title}</h2>
        {count ? (
          <span className="rounded-full bg-brand-forest px-2 py-0.5 text-xs font-semibold tabular-nums text-brand-ink">{count}</span>
        ) : null}
      </div>
      <div className="flex-1">{children}</div>
      {footer ? <div className="mt-3 border-t border-brand-beige pt-3">{footer}</div> : null}
    </Card>
  );
}

/** Botão de WhatsApp com alvo de toque de 44px; sem modelo, abre a conversa vazia. */
function WhatsAppButton({
  customer,
  template,
  label,
  extra,
}: {
  customer: Customer;
  template: string;
  label: string;
  extra?: Record<string, string>;
}) {
  const message = template ? buildCustomerMessage(template, customer, extra) : "";
  return (
    <a
      href={buildWhatsAppLink(customer.phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label}: ${customer.fullName}`}
      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-brand-beige px-3 text-xs font-medium text-brand-moss transition hover:border-brand-sage hover:bg-brand-sage/10 active:scale-[0.97]"
    >
      <MessageCircle size={15} aria-hidden="true" />
      <span className="hidden min-[400px]:inline">{label}</span>
    </a>
  );
}

function RemindersCard({
  appointments,
  templates,
}: {
  appointments: AppointmentWithRelations[];
  templates: Settings["messageTemplates"] | null;
}) {
  const router = useRouter();
  // Marca na hora (otimista); o servidor confirma no refresh.
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const isSent = (a: AppointmentWithRelations) => sent[a.id] ?? a.reminderSentAt !== null;
  const pending = appointments.filter((a) => !isSent(a)).length;

  async function mark(id: string, value: boolean) {
    setSent((prev) => ({ ...prev, [id]: value }));
    await setReminderSentAction(id, value);
    router.refresh();
  }

  return (
    <AlertCard
      icon={BellRing}
      title="Lembretes de amanhã"
      count={pending}
      footer={
        appointments.length ? (
          <p className="text-xs text-brand-graphite/60">
            Abrir o WhatsApp marca como aberto. Confira se a mensagem foi enviada.
          </p>
        ) : null
      }
    >
      {appointments.length === 0 ? (
        <EmptyState compact title="Nada marcado para amanhã" hint="Os agendamentos do dia seguinte aparecem aqui." />
      ) : (
        <ul className="space-y-2">
          {appointments.map((a) => {
            const done = isSent(a);
            const message = templates?.reminder ? buildAppointmentMessage("reminder", a, a.customer, a.service, templates) : "";
            return (
              <li
                key={a.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border border-brand-beige bg-white px-3 py-2",
                  done && "opacity-70"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-brand-graphite">{a.customer.fullName}</p>
                  <p className="truncate text-xs text-brand-graphite/60">
                    {a.startTime} · {a.service.name}
                  </p>
                </div>
                {done ? (
                  <button
                    type="button"
                    onClick={() => mark(a.id, false)}
                    title="Desmarcar"
                    aria-label={`Lembrete aberto para ${a.customer.fullName}. Desmarcar`}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-brand-moss transition hover:bg-brand-sage/10"
                  >
                    <Check size={15} aria-hidden="true" />
                    <span className="hidden min-[400px]:inline">Aberto</span>
                  </button>
                ) : (
                  <a
                    href={buildWhatsAppLink(a.customer.phone, message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => mark(a.id, true)}
                    aria-label={`Lembrar: ${a.customer.fullName}`}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-brand-beige px-3 text-xs font-medium text-brand-moss transition hover:border-brand-sage hover:bg-brand-sage/10 active:scale-[0.97]"
                  >
                    <MessageCircle size={15} aria-hidden="true" />
                    <span className="hidden min-[400px]:inline">Lembrar</span>
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AlertCard>
  );
}

function BirthdaysCard({ birthdays, template, today }: { birthdays: UpcomingBirthday[]; template: string; today: string }) {
  return (
    <AlertCard icon={CakeSlice} title="Aniversariantes da semana" count={birthdays.length}>
      {birthdays.length === 0 ? (
        <EmptyState compact title="Ninguém faz aniversário nesta semana" hint="Cadastre a data na ficha do cliente, em Clientes." />
      ) : (
        <ul className="space-y-2">
          {birthdays.map(({ customer, date, daysAway }) => (
            <li key={customer.id} className="flex items-center justify-between gap-3 rounded-xl border border-brand-beige bg-white px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-brand-graphite">{customer.fullName}</p>
                <p className={cn("text-xs", daysAway === 0 ? "font-semibold text-brand-forest" : "text-brand-graphite/60")}>
                  {date === today ? "Hoje" : daysAway === 1 ? "Amanhã" : formatChipDatePtBR(date)}
                </p>
              </div>
              <WhatsAppButton customer={customer} template={template} label="Dar parabéns" />
            </li>
          ))}
        </ul>
      )}
    </AlertCard>
  );
}

function LapsedCard({
  lapsed,
  lapsedDays,
  template,
}: {
  lapsed: { total: number; list: LapsedCustomer[] };
  lapsedDays: number;
  template: string;
}) {
  return (
    <AlertCard
      icon={UserRoundSearch}
      title={`Não voltam há ${lapsedDays}+ dias`}
      count={lapsed.total}
      footer={
        lapsed.total > lapsed.list.length ? (
          <p className="text-xs text-brand-graphite/60">
            Mostrando {lapsed.list.length} de {lapsed.total}, os que vieram por último primeiro.
          </p>
        ) : null
      }
    >
      {lapsed.list.length === 0 ? (
        <EmptyState compact title="Todo mundo voltando em dia" hint="Quem passar do prazo sem nada marcado aparece aqui." />
      ) : (
        <ul className="space-y-2">
          {lapsed.list.map(({ customer, daysSince }) => (
            <li key={customer.id} className="flex items-center justify-between gap-3 rounded-xl border border-brand-beige bg-white px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-brand-graphite">{customer.fullName}</p>
                <p className="text-xs text-brand-graphite/60">Última visita há {daysSince} dias</p>
              </div>
              <WhatsAppButton customer={customer} template={template} label="Convidar" />
            </li>
          ))}
        </ul>
      )}
    </AlertCard>
  );
}

function ReturnsCard({ returns, template }: { returns: { total: number; list: ReturnDueCustomer[] }; template: string }) {
  return (
    <AlertCard
      icon={Undo2}
      title="Retornos para chamar"
      count={returns.total}
      footer={
        returns.total > returns.list.length ? (
          <p className="text-xs text-brand-graphite/60">
            Mostrando {returns.list.length} de {returns.total}, os mais atrasados primeiro.
          </p>
        ) : null
      }
    >
      {returns.list.length === 0 ? (
        <EmptyState compact title="Nenhum retorno nesta semana" hint="Defina o prazo de retorno de cada serviço em Serviços." />
      ) : (
        <ul className="space-y-2">
          {returns.list.map(({ customer, serviceName, daysUntil }) => (
            <li key={customer.id} className="flex items-center justify-between gap-3 rounded-xl border border-brand-beige bg-white px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-brand-graphite">{customer.fullName}</p>
                <p className={cn("truncate text-xs", daysUntil < 0 ? "font-medium text-amber-800" : "text-brand-graphite/60")}>
                  {serviceName} ·{" "}
                  {daysUntil === 0 ? "hoje" : daysUntil > 0 ? `em ${daysUntil} dia(s)` : `passou há ${-daysUntil} dia(s)`}
                </p>
              </div>
              <WhatsAppButton customer={customer} template={template} extra={{ servico: serviceName }} label="Chamar" />
            </li>
          ))}
        </ul>
      )}
    </AlertCard>
  );
}

function GoalCard({ goal, monthInCents }: { goal: { goalCents: number; scheduledCents: number }; monthInCents: number }) {
  if (goal.goalCents <= 0) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-sage/20 text-brand-moss">
            <Target size={18} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <p className="text-sm text-brand-graphite/70">Defina uma meta de entradas para acompanhar o mês aqui.</p>
        </div>
        <Link
          href="/admin/configuracoes?aba=painel"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-moss hover:underline"
        >
          Definir meta <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </Card>
    );
  }
  const forecast = monthInCents + goal.scheduledCents;
  const pct = (v: number) => Math.min(100, Math.round((v / goal.goalCents) * 100));
  const reached = monthInCents >= goal.goalCents;
  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 font-serif text-lg text-brand-forest">
          <Target size={18} strokeWidth={1.75} className="text-brand-moss" aria-hidden="true" /> Meta do mês
        </h2>
        <p className="valor-sensivel text-sm tabular-nums text-brand-graphite/70">
          <strong className="text-brand-graphite">{formatBRL(monthInCents)}</strong> de {formatBRL(goal.goalCents)} (
          {pct(monthInCents)}%)
        </p>
      </div>
      <div
        className="relative h-3 overflow-hidden rounded-full bg-brand-beige"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct(monthInCents)}
        aria-label="Entradas do mês em relação à meta"
      >
        {/* Faixa clara = previsão com o que está marcado; faixa cheia = o que já entrou. */}
        <div className="absolute inset-y-0 left-0 rounded-full bg-brand-sage/50" style={{ width: `${pct(forecast)}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-brand-forest transition-[width] duration-700" style={{ width: `${pct(monthInCents)}%` }} />
      </div>
      <p className="valor-sensivel mt-2 text-xs text-brand-graphite/60">
        {reached
          ? "Meta alcançada neste mês."
          : `Com o que está marcado até o fim do mês, a previsão é ${formatBRL(forecast)} (${pct(forecast)}%). Faltam ${formatBRL(goal.goalCents - monthInCents)}.`}
      </p>
    </Card>
  );
}

function LowStockCard({ products }: { products: Product[] }) {
  return (
    <AlertCard
      icon={Package}
      title="Estoque baixo"
      count={products.length}
      footer={
        <Link href="/admin/estoque" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-moss hover:underline">
          Ir para o estoque <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      }
    >
      {products.length === 0 ? (
        <EmptyState compact title="Estoque em dia" hint="Defina o mínimo de cada produto em Estoque para receber o aviso." />
      ) : (
        <ul className="space-y-2">
          {products.slice(0, 8).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-brand-beige bg-white px-3 py-2.5">
              <p className="min-w-0 truncate text-sm font-medium text-brand-graphite">{p.name}</p>
              <p
                className={cn(
                  "shrink-0 text-xs font-semibold tabular-nums",
                  p.stockQuantity === 0 ? "text-red-700" : "text-amber-800"
                )}
              >
                {p.stockQuantity === 0 ? "Acabou" : `${p.stockQuantity} de ${p.minStock}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AlertCard>
  );
}

function AppointmentRow({
  appointment,
  onClick,
  showDate,
}: {
  appointment: AppointmentWithRelations;
  onClick: () => void;
  showDate?: boolean;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-brand-beige bg-white px-4 py-3 text-left text-sm transition duration-300 hover:translate-x-1 hover:border-brand-sage hover:shadow-softer active:scale-[0.99]"
      >
        <div className="min-w-0">
          <p className="truncate font-medium text-brand-graphite">{appointment.customer.fullName}</p>
          <p className="truncate text-xs text-brand-graphite/60">
            {appointment.service.name} · {showDate ? `${formatShortDatePtBR(appointment.date)} · ` : ""}
            {appointment.startTime}
          </p>
        </div>
        <StatusBadge status={appointment.status} />
      </button>
    </li>
  );
}
