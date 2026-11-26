"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FileDown } from "lucide-react";
import { FilterBar } from "@/components/admin/FilterBar";
import { Button } from "@/components/ui/Button";
import { exportReportPdf } from "@/lib/reports/export-pdf";
import { StatTile } from "@/components/admin/FinanceBadges";
import { useFinanceOptions } from "@/components/admin/FinanceOptionsProvider";
import type { ReportBlock } from "@/lib/panel/preferences";
import { formatBRL } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";
import type { CountRow, Report } from "@/lib/data/reports";

// Validado com o validador de paleta do dataviz (contraste ≥ 3:1 no branco, croma ok).
// O par fica na faixa de daltonismo que exige reforço: legenda + tooltip + tabela.
// Cores por variável CSS (globals.css): o tema escuro troca os tons sem recriar o gráfico.
const IN_COLOR = "var(--chart-in)";
const OUT_COLOR = "var(--chart-out)";
const SINGLE = "var(--chart-out)";
const INK = "rgb(var(--c-graphite))";
const INK_MUTED = "rgb(var(--c-graphite) / 0.55)";
const GRID = "rgb(var(--c-beige))";

const TILE_COLS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
};

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function keyLabel(key: string, groupBy: Report["groupBy"]) {
  if (groupBy === "month") return `${MONTHS[Number(key.slice(5, 7)) - 1]}/${key.slice(2, 4)}`;
  return `${key.slice(8, 10)}/${key.slice(5, 7)}`;
}

function compactBRL(cents: number) {
  const v = cents / 100;
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

function ChartCard({ title, subtitle, children, table }: { title: string; subtitle?: string; children: React.ReactNode; table?: React.ReactNode }) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className="rounded-2xl border border-brand-beige bg-white p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-serif text-lg text-brand-forest">{title}</h2>
          {subtitle ? <p className="text-xs text-brand-graphite/60">{subtitle}</p> : null}
        </div>
        {table ? (
          <button type="button" onClick={() => setShowTable((v) => !v)} className="text-xs font-medium text-brand-moss hover:underline">
            {showTable ? "Ver gráfico" : "Ver tabela"}
          </button>
        ) : null}
      </div>
      {showTable ? table : children}
    </section>
  );
}

function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-xl border border-brand-beige bg-white px-3 py-2 text-xs shadow-soft">
      <p className="mb-1 font-medium text-brand-graphite">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-brand-graphite/80">
          {r.color ? <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: r.color }} /> : null}
          {r.label}: <span className="font-semibold tabular-nums text-brand-graphite">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

function RankingChart({ rows, unit, valueOf, format, limit }: { rows: CountRow[] | { name: string; value: number }[]; unit: string; valueOf: (r: any) => number; format: (v: number) => string; limit: number }) {
  const data = rows.slice(0, limit).map((r: any) => ({ name: r.name ?? r.method, value: valueOf(r), raw: r }));
  if (data.length === 0) return <p className="py-10 text-center text-sm text-brand-graphite/50">Nada neste período.</p>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 40 + 20)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }} barCategoryGap={8}>
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tickLine={false}
          axisLine={false}
          tick={{ fill: INK, fontSize: 12 }}
          tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 19)}…` : v)}
        />
        <Tooltip
          cursor={{ fill: "rgba(231,227,216,0.45)" }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipBox title={String(payload[0].payload.name)} rows={[{ label: unit, value: format(Number(payload[0].value)) }]} />
            ) : null
          }
        />
        <Bar dataKey="value" fill={SINGLE} radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
          <LabelList dataKey="value" position="right" formatter={(v: unknown) => format(Number(v))} style={{ fill: INK, fontSize: 12, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function SimpleTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="max-h-80 overflow-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-brand-graphite/60">
          <tr>
            {head.map((h, i) => (
              <th key={h} className={cn("py-2", i > 0 && "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-brand-beige/70">
              {r.map((c, j) => (
                <td key={j} className={cn("py-2", j > 0 && "text-right tabular-nums")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportsView({
  report,
  range,
  defaults,
  show,
  rankingSize,
}: {
  report: Report;
  /** Período de fato consultado (o "Tudo" do filtro vira os últimos 12 meses). */
  range: { dateFrom: string; dateTo: string };
  defaults: { dateFrom: string; dateTo: string };
  show: Record<ReportBlock, boolean>;
  rankingSize: number;
}) {
  const fin = useFinanceOptions();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);

  async function handleExport() {
    setExporting(true);
    setExportError(false);
    try {
      await exportReportPdf(report, range, (m) => fin.methodLabel(m as Parameters<typeof fin.methodLabel>[0]));
    } catch (error) {
      console.error("[relatorios] exportar PDF:", error);
      setExportError(true);
    } finally {
      setExporting(false);
    }
  }
  const cashData = report.cash.map((p) => ({ ...p, label: keyLabel(p.key, report.groupBy) }));
  const result = report.inCents - report.outCents;
  const totalServices = report.services.reduce((s, r) => s + r.count, 0);
  const methodRows = report.paymentMethods.map((m) => ({ name: fin.methodLabel(m.method), value: m.totalCents }));

  const tiles = [
    show.tileIn && <StatTile key="in" label="Entrou no caixa" value={formatBRL(report.inCents)} tone="in" />,
    show.tileOut && <StatTile key="out" label="Saiu do caixa" value={formatBRL(report.outCents)} tone="out" />,
    show.tileResult && <StatTile key="result" label="Resultado" value={formatBRL(result)} tone={result >= 0 ? "in" : "out"} />,
    show.tileSales && (
      <StatTile key="sales" label="Vendas" value={String(report.salesCount)} hint={`ticket médio ${formatBRL(report.averageTicketCents)}`} />
    ),
    show.tileServices && <StatTile key="services" label="Serviços realizados" value={String(totalServices)} />,
  ].filter(Boolean);

  const rankings = [
    show.chartServices && (
      <ChartCard
        key="services"
        title="Serviços realizados"
        subtitle="Quantas vezes cada serviço foi feito no período"
        table={<SimpleTable head={["Serviço", "Quantidade", "Valor"]} rows={report.services.map((r) => [r.name, r.count, formatBRL(r.totalCents)])} />}
      >
        <RankingChart rows={report.services} unit="Quantidade" valueOf={(r: CountRow) => r.count} format={(v) => String(v)} limit={rankingSize} />
      </ChartCard>
    ),
    show.chartProducts && (
      <ChartCard
        key="products"
        title="Produtos vendidos"
        subtitle="Unidades vendidas no período"
        table={<SimpleTable head={["Produto", "Unidades", "Valor"]} rows={report.products.map((r) => [r.name, r.count, formatBRL(r.totalCents)])} />}
      >
        <RankingChart rows={report.products} unit="Unidades" valueOf={(r: CountRow) => r.count} format={(v) => String(v)} limit={rankingSize} />
      </ChartCard>
    ),
    show.chartPayments && (
      <ChartCard
        key="payments"
        title="Recebido por forma de pagamento"
        table={<SimpleTable head={["Forma", "Valor"]} rows={methodRows.map((m) => [m.name, formatBRL(m.value)])} />}
      >
        <RankingChart
          rows={methodRows}
          unit="Valor"
          valueOf={(r: { value: number }) => r.value}
          format={(v) => compactBRL(v)}
          limit={rankingSize}
        />
      </ChartCard>
    ),
  ].filter(Boolean);

  const nothingVisible = !tiles.length && !show.chartCash && !rankings.length;

  return (
    <div className="space-y-5">
      <FilterBar fields={["date"]} defaults={defaults} />

      <div className="flex flex-wrap items-center justify-end gap-3">
        {exportError ? <p className="text-sm text-red-700">Não deu para gerar o PDF. Tente de novo.</p> : null}
        <Button variant="secondary" onClick={handleExport} disabled={exporting}>
          <FileDown size={16} aria-hidden="true" /> {exporting ? "Gerando PDF..." : "Exportar PDF"}
        </Button>
      </div>

      {tiles.length ? <div className={cn("grid grid-cols-2 gap-3", TILE_COLS[tiles.length])}>{tiles}</div> : null}

      {show.chartCash ? (
        <ChartCard
          title="Ganhos: entradas x saídas"
          subtitle={`Dinheiro que entrou e saiu de verdade, por ${report.groupBy === "day" ? "dia" : "mês"}`}
          table={
            <SimpleTable
              head={["Período", "Entradas", "Saídas", "Resultado"]}
              rows={cashData
                .filter((p) => p.inCents || p.outCents)
                .map((p) => [p.label, formatBRL(p.inCents), formatBRL(p.outCents), formatBRL(p.inCents - p.outCents)])}
            />
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cashData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: INK_MUTED, fontSize: 11 }} minTickGap={12} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: INK_MUTED, fontSize: 11 }} width={72} tickFormatter={compactBRL} />
              <Tooltip
                cursor={{ fill: "rgba(231,227,216,0.45)" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <TooltipBox
                      title={String(label)}
                      rows={[
                        { label: "Entradas", value: formatBRL(Number(payload[0]?.payload.inCents ?? 0)), color: IN_COLOR },
                        { label: "Saídas", value: formatBRL(Number(payload[0]?.payload.outCents ?? 0)), color: OUT_COLOR },
                        { label: "Resultado", value: formatBRL(Number(payload[0]?.payload.inCents ?? 0) - Number(payload[0]?.payload.outCents ?? 0)) },
                      ]}
                    />
                  ) : null
                }
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={28}
                iconType="square"
                iconSize={10}
                formatter={(value: string) => <span style={{ color: INK, fontSize: 12 }}>{value}</span>}
              />
              <Bar name="Entradas" dataKey="inCents" fill={IN_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              <Bar name="Saídas" dataKey="outCents" fill={OUT_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}

      {rankings.length ? <div className={cn("grid gap-5", rankings.length > 1 && "xl:grid-cols-2")}>{rankings}</div> : null}

      {nothingVisible ? (
        <p className="rounded-2xl border border-dashed border-brand-beige bg-white px-4 py-10 text-center text-sm text-brand-graphite/60">
          Todos os gráficos estão escondidos. Escolha quais mostrar em{" "}
          <a href="/admin/configuracoes?aba=painel" className="font-medium text-brand-moss underline">
            Configurações › Painel e gráficos
          </a>
          .
        </p>
      ) : null}
    </div>
  );
}

