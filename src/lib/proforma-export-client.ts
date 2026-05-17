import type { ProformaExportPayload } from "@/lib/proforma-export-types";
import { proformaFileBaseName } from "@/lib/proforma-export-types";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTotal(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function buildMetaHtml(data: ProformaExportPayload): string {
  const parts: string[] = [
    `<div><strong>Pesquisa:</strong> ${escapeHtml(data.studyTitle)}</div>`,
    `<div><strong>Protocolo:</strong> ${escapeHtml(data.protocolNumber)}</div>`,
    `<div><strong>Modalidade:</strong> ${escapeHtml(data.billingModeLabel)}</div>`,
    `<div><strong>Status do lote:</strong> ${escapeHtml(data.batchStatusLabel)}</div>`,
    `<div><strong>Moeda:</strong> ${escapeHtml(data.currency)}</div>`,
  ];
  if (data.referenceMonth) {
    parts.push(`<div><strong>Mes referencia:</strong> ${escapeHtml(data.referenceMonth)}</div>`);
  }
  if (data.submittedAt) {
    parts.push(`<div><strong>Enviado em:</strong> ${escapeHtml(data.submittedAt)}</div>`);
  }
  if (data.proformaNotes) {
    parts.push(`<div><strong>Observacoes:</strong> ${escapeHtml(data.proformaNotes)}</div>`);
  }
  return parts.join("");
}

function buildProformaHtml(data: ProformaExportPayload, forPrint = false): string {
  const rows = data.lines
    .map(
      (l) => `<tr>
        <td>${escapeHtml(l.subjectCode)}</td>
        <td>${escapeHtml(l.visitDate)}</td>
        <td>${escapeHtml(l.procedureName)}${l.description ? `<br/><small>${escapeHtml(l.description)}</small>` : ""}</td>
        <td style="text-align:right">${escapeHtml(l.grossFormatted)}</td>
        <td style="text-align:right">${escapeHtml(l.holdbackFormatted)}</td>
        <td style="text-align:right"><strong>${escapeHtml(l.netFormatted)}</strong></td>
      </tr>`
    )
    .join("");

  const printCss = forPrint
    ? `@media print { body { margin: 12mm; } .hint { display: none; } }`
    : "";
  const printHint = forPrint
    ? '<p class="hint" style="margin-top:20px;font-size:10pt;color:#666">Use Imprimir e escolha &quot;Salvar como PDF&quot; no destino.</p>'
    : "";

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
  <meta charset="utf-8" />
  <title>Proforma ${escapeHtml(data.batchNumber)}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #111; }
    h1 { font-size: 16pt; margin: 0 0 8px; }
    .meta { font-size: 10pt; color: #444; margin-bottom: 16px; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; }
    th { background: #f1f5f9; text-align: left; font-size: 10pt; }
    tfoot td { font-weight: bold; background: #f8fafc; }
    ${printCss}
  </style>
</head>
<body>
  <h1>Proforma Invoice — Lote ${escapeHtml(data.batchNumber)}</h1>
  <div class="meta">${buildMetaHtml(data)}</div>
  <table>
    <thead>
      <tr>
        <th>Paciente</th>
        <th>Data da visita</th>
        <th>Procedimento</th>
        <th style="text-align:right">Valor total</th>
        <th style="text-align:right">Holdback</th>
        <th style="text-align:right">Valor a pagar</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="text-align:right">Total (${escapeHtml(data.currency)})</td>
        <td style="text-align:right">${escapeHtml(formatTotal(data.totals.gross, data.currency))}</td>
        <td style="text-align:right">${escapeHtml(formatTotal(data.totals.hold, data.currency))}</td>
        <td style="text-align:right">${escapeHtml(formatTotal(data.totals.net, data.currency))}</td>
      </tr>
    </tfoot>
  </table>
  ${printHint}
</body>
</html>`;
}

export async function exportProformaToDoc(data: ProformaExportPayload) {
  const html = buildProformaHtml(data);
  const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
  downloadBlob(blob, `${proformaFileBaseName(data.batchNumber)}.doc`);
}

export async function exportProformaToExcel(data: ProformaExportPayload) {
  const XLSX = await import("xlsx");
  const headerRows: (string | number)[][] = [
    ["Proforma Invoice"],
    [`Lote: ${data.batchNumber}`],
    [`Pesquisa: ${data.studyTitle}`],
    [`Protocolo: ${data.protocolNumber}`],
    [`Modalidade: ${data.billingModeLabel}`],
    [`Status: ${data.batchStatusLabel}`],
    [`Moeda: ${data.currency}`],
  ];
  if (data.referenceMonth) headerRows.push([`Mes referencia: ${data.referenceMonth}`]);
  if (data.submittedAt) headerRows.push([`Enviado em: ${data.submittedAt}`]);
  if (data.proformaNotes) headerRows.push([`Observacoes: ${data.proformaNotes}`]);
  headerRows.push([]);
  headerRows.push(["Paciente", "Data da visita", "Procedimento", "Descricao", "Valor total", "Holdback", "Valor a pagar"]);
  for (const l of data.lines) {
    headerRows.push([l.subjectCode, l.visitDate, l.procedureName, l.description ?? "", l.grossAmount, l.holdbackAmount, l.netAmount]);
  }
  headerRows.push([]);
  headerRows.push(["TOTAL", "", "", "", data.totals.gross, data.totals.hold, data.totals.net]);
  const ws = XLSX.utils.aoa_to_sheet(headerRows);
  ws["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 28 }, { wch: 32 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Proforma");
  XLSX.writeFile(wb, `${proformaFileBaseName(data.batchNumber)}.xlsx`);
}

export async function exportProformaToPdf(data: ProformaExportPayload) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const margin = 14;
  let y = 16;
  doc.setFontSize(14);
  doc.text(`Proforma Invoice — Lote ${data.batchNumber}`, margin, y);
  y += 8;
  doc.setFontSize(9);
  for (const line of [
    `Pesquisa: ${data.studyTitle}`,
    `Protocolo: ${data.protocolNumber}`,
    `Modalidade: ${data.billingModeLabel} · Status: ${data.batchStatusLabel}`,
  ]) {
    doc.text(line, margin, y);
    y += 4.5;
  }
  if (data.referenceMonth) { doc.text(`Mes ref.: ${data.referenceMonth}`, margin, y); y += 4.5; }
  if (data.submittedAt) { doc.text(`Enviado: ${data.submittedAt}`, margin, y); y += 4.5; }
  if (data.proformaNotes) {
    const note = doc.splitTextToSize(`Obs.: ${data.proformaNotes}`, 270);
    doc.text(note, margin, y);
    y += note.length * 4.5;
  }
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [["Paciente", "Data visita", "Procedimento", "Valor total", "Holdback", "Valor a pagar"]],
    body: data.lines.map((l) => [
      l.subjectCode,
      l.visitDate,
      l.description ? `${l.procedureName}\n${l.description}` : l.procedureName,
      l.grossFormatted,
      l.holdbackFormatted,
      l.netFormatted,
    ]),
    foot: [["TOTAL", "", "", formatTotal(data.totals.gross, data.currency), formatTotal(data.totals.hold, data.currency), formatTotal(data.totals.net, data.currency)]],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 118, 110] },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
    margin: { left: margin, right: margin },
  });
  doc.save(`${proformaFileBaseName(data.batchNumber)}.pdf`);
}

export function printProforma(data: ProformaExportPayload) {
  const html = buildProformaHtml(data, true);
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) { alert("Permita pop-ups para imprimir o proforma."); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  win.onload = () => { win.print(); };
}

export function printProformaAsPdf(data: ProformaExportPayload) {
  printProforma(data);
}
