import type { Report } from "@/lib/data/reports";
import { formatBRL } from "@/lib/utils/money";
import { formatShortDatePtBR, todayDateStr, nowTimeStr } from "@/lib/utils/date-format";

// Cores fixas do PDF (papel é sempre claro, não segue o tema do painel).
const INK: [number, number, number] = [38, 38, 38];
const MUTED: [number, number, number] = [110, 110, 110];
const ACCENT: [number, number, number] = [47, 79, 62];
const ROW_ALT: [number, number, number] = [246, 244, 238];

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function periodLabel(key: string, groupBy: Report["groupBy"]) {
  if (groupBy === "month") return `${MONTHS[Number(key.slice(5, 7)) - 1]}/${key.slice(0, 4)}`;
  return formatShortDatePtBR(key);
}

/**
 * Gera o PDF do relatório no navegador e baixa o arquivo. As bibliotecas só
 * carregam no clique, para não pesar na abertura da página.
 */
export async function exportReportPdf(
  report: Report,
  range: { dateFrom: string; dateTo: string },
  methodLabel: (method: string) => string
) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...ACCENT);
  doc.text("Casa Herbert", margin, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text("Relatório financeiro", margin, y + 26);
  doc.text(
    `Período: ${formatShortDatePtBR(range.dateFrom)} a ${formatShortDatePtBR(range.dateTo)}`,
    pageWidth - margin,
    y + 8,
    { align: "right" }
  );
  doc.text(`Gerado em ${formatShortDatePtBR(todayDateStr())} às ${nowTimeStr()}`, pageWidth - margin, y + 26, { align: "right" });
  y += 44;

  const result = report.inCents - report.outCents;
  const totalServices = report.services.reduce((s, r) => s + r.count, 0);
  const common = {
    margin: { left: margin, right: margin },
    styles: { font: "helvetica", fontSize: 10, textColor: INK, cellPadding: 5 },
    headStyles: { fillColor: ACCENT, textColor: [255, 255, 255] as [number, number, number], fontStyle: "bold" as const },
    alternateRowStyles: { fillColor: ROW_ALT },
  };
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  function section(title: string, head: string[], body: (string | number)[][], empty = "Nada neste período.") {
    if (y > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...ACCENT);
    doc.text(title, margin, y + 14);
    autoTable(doc, {
      ...common,
      startY: y + 22,
      head: [head],
      body: body.length ? body.map((r) => r.map(String)) : [[empty, ...head.slice(1).map(() => "")]],
      columnStyles: Object.fromEntries(head.slice(1).map((_, i) => [i + 1, { halign: "right" as const }])),
    });
    y = lastY() + 18;
  }

  section(
    "Resumo",
    ["Indicador", "Valor"],
    [
      ["Entrou no caixa", formatBRL(report.inCents)],
      ["Saiu do caixa", formatBRL(report.outCents)],
      ["Resultado", formatBRL(result)],
      ["Vendas", String(report.salesCount)],
      ["Ticket médio", formatBRL(report.averageTicketCents)],
      ["Serviços realizados", String(totalServices)],
    ]
  );

  section(
    `Entradas x saídas por ${report.groupBy === "day" ? "dia" : "mês"}`,
    ["Período", "Entradas", "Saídas", "Resultado"],
    report.cash
      .filter((p) => p.inCents || p.outCents)
      .map((p) => [periodLabel(p.key, report.groupBy), formatBRL(p.inCents), formatBRL(p.outCents), formatBRL(p.inCents - p.outCents)])
  );

  section(
    "Recebido por forma de pagamento",
    ["Forma", "Valor"],
    report.paymentMethods.map((m) => [methodLabel(m.method), formatBRL(m.totalCents)])
  );

  section(
    "Serviços realizados",
    ["Serviço", "Quantidade", "Valor"],
    report.services.map((r) => [r.name, r.count, formatBRL(r.totalCents)])
  );

  section(
    "Produtos vendidos",
    ["Produto", "Unidades", "Valor"],
    report.products.map((r) => [r.name, r.count, formatBRL(r.totalCents)])
  );

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      "Valores do livro-caixa: o que entrou e saiu de verdade. Estornos contam no dia do estorno.",
      margin,
      doc.internal.pageSize.getHeight() - 20
    );
    doc.text(`${i} / ${pages}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 20, { align: "right" });
  }

  doc.save(`relatorio-casa-herbert-${range.dateFrom}-a-${range.dateTo}.pdf`);
}
