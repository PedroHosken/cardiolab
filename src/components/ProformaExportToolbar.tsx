"use client";

import { useState } from "react";
import type { ProformaExportPayload } from "@/lib/proforma-export-types";
import {
  exportProformaToDoc,
  exportProformaToExcel,
  exportProformaToPdf,
  printProforma,
  printProformaAsPdf,
} from "@/lib/proforma-export-client";

const btnStyle: React.CSSProperties = {
  padding: "7px 12px",
  fontSize: 12,
  fontWeight: 600,
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  background: "var(--color-surface)",
  cursor: "pointer",
};

export function ProformaExportToolbar({ data }: { data: ProformaExportPayload }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function run(label: string, fn: () => void | Promise<void>) {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      alert(`Erro ao ${label.toLowerCase()}. Tente novamente.`);
    } finally {
      setBusy(null);
    }
  }

  const disabled = busy !== null;

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-muted)", marginRight: 4 }}>
          Exportar / imprimir:
        </span>
        <button
          type="button"
          style={btnStyle}
          disabled={disabled}
          onClick={() => run("Excel", () => exportProformaToExcel(data))}
        >
          {busy === "Excel" ? "Gerando…" : "Salvar Excel"}
        </button>
        <button
          type="button"
          style={btnStyle}
          disabled={disabled}
          onClick={() => run("PDF", () => exportProformaToPdf(data))}
        >
          {busy === "PDF" ? "Gerando…" : "Salvar PDF"}
        </button>
        <button
          type="button"
          style={btnStyle}
          disabled={disabled}
          onClick={() => run("Word", () => exportProformaToDoc(data))}
        >
          {busy === "Word" ? "Gerando…" : "Salvar Word (.doc)"}
        </button>
        <span style={{ width: 1, height: 24, background: "var(--color-border)", margin: "0 4px" }} />
        <button
          type="button"
          style={btnStyle}
          disabled={disabled}
          onClick={() => run("Imprimir", () => printProforma(data))}
        >
          Imprimir
        </button>
        <button
          type="button"
          style={btnStyle}
          disabled={disabled}
          onClick={() => run("PDF via impressao", () => printProformaAsPdf(data))}
          title="Abre janela de impressao — escolha Salvar como PDF"
        >
          Imprimir → PDF
        </button>
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--color-muted)" }}>
        O arquivo inclui protocolo, paciente, data da visita, procedimento, valores e total consolidado.
        Use <strong>Imprimir → PDF</strong> para gerar PDF pelo navegador.
      </p>
    </div>
  );
}
