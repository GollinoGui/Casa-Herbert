import type { DayRouteItem } from "@/lib/data/day-route";
import { formatLongDatePtBR, formatShortDatePtBR, nowTimeStr, todayDateStr } from "@/lib/utils/date-format";
import { formatPhoneDisplay } from "@/lib/utils/phone";

const INK: [number, number, number] = [38, 38, 38];
const MUTED: [number, number, number] = [110, 110, 110];
const ACCENT: [number, number, number] = [47, 79, 62];
const ROW_ALT: [number, number, number] = [246, 244, 238];

/** Roteiro de um dia em uma página A4, para imprimir ou mandar no WhatsApp. jspdf carrega só no clique. */
export async function exportDayRoutePdf(date: string, items: DayRouteItem[]) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...ACCENT);
  doc.text("Casa Herbert", margin, margin + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(`Roteiro do dia · ${formatLongDatePtBR(date)}`, margin, margin + 26);
  doc.text(
    items.length === 1 ? "1 atendimento" : `${items.length} atendimentos`,
    pageWidth - margin,
    margin + 8,
    { align: "right" }
  );
  doc.text(`Gerado em ${formatShortDatePtBR(todayDateStr())} às ${nowTimeStr()}`, pageWidth - margin, margin + 26, {
    align: "right",
  });

  const body = items.map(({ appointment: a, packageLabel }) => {
    const notes = [
      packageLabel,
      a.status === "PENDING" ? "Ainda não confirmado" : null,
      a.customerNotes ? `Cliente: ${a.customerNotes}` : null,
      a.adminNotes,
      a.customer.notes ? `Ficha: ${a.customer.notes}` : null,
    ].filter(Boolean);
    return [
      `${a.startTime}\n${a.endTime}`,
      `${a.customer.fullName}\n${formatPhoneDisplay(a.customer.phone)}`,
      a.service.name,
      notes.join("\n"),
    ];
  });

  autoTable(doc, {
    startY: margin + 44,
    margin: { left: margin, right: margin },
    head: [["Horário", "Cliente", "Serviço", "Observações"]],
    body: body.length ? body : [["", "Nenhum atendimento marcado neste dia.", "", ""]],
    styles: { font: "helvetica", fontSize: 10, textColor: INK, cellPadding: 6, valign: "top" },
    headStyles: { fillColor: ACCENT, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: ROW_ALT },
    columnStyles: {
      0: { cellWidth: 52, fontStyle: "bold" },
      1: { cellWidth: 140 },
      2: { cellWidth: 120 },
    },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`${i} / ${pages}`, pageWidth - margin, pageHeight - 20, { align: "right" });
  }

  doc.save(`roteiro-casa-herbert-${date}.pdf`);
}
