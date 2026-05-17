"use client";

import { useState } from "react";
import {
  glosseLine,
  holdLine,
  releaseLineToReady,
  removeLineFromDraftBatch,
} from "@/app/pesquisas/[id]/lotes/actions";

export function BatchLineActions({
  lineId,
  studyId,
  batchId,
  lineStatus,
  batchStatus,
  canEdit,
}: {
  lineId: string;
  studyId: string;
  batchId: string;
  lineStatus: string;
  batchStatus: string;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState<"glosse" | "hold" | null>(null);

  if (!canEdit) {
    if (["GLOSSED", "HELD"].includes(lineStatus)) {
      return (
        <form action={releaseLineToReady}>
          <input type="hidden" name="lineId" value={lineId} />
          <input type="hidden" name="studyId" value={studyId} />
          <button type="submit" style={linkBtnStyle}>
            Voltar a pendente
          </button>
        </form>
      );
    }
    return <span style={{ fontSize: 11, color: "var(--color-muted)" }}>—</span>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 140 }}>
      {batchStatus === "DRAFT" ? (
        <form action={removeLineFromDraftBatch}>
          <input type="hidden" name="lineId" value={lineId} />
          <input type="hidden" name="studyId" value={studyId} />
          <input type="hidden" name="batchId" value={batchId} />
          <button type="submit" style={linkBtnStyle}>
            Remover do lote
          </button>
        </form>
      ) : null}
      <button type="button" onClick={() => setOpen(open === "glosse" ? null : "glosse")} style={linkBtnStyle}>
        Glosar
      </button>
      {open === "glosse" ? (
        <form action={glosseLine} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <input type="hidden" name="lineId" value={lineId} />
          <input type="hidden" name="studyId" value={studyId} />
          <input type="hidden" name="batchId" value={batchId} />
          <textarea
            name="reason"
            required
            rows={2}
            placeholder="Motivo da glosa..."
            style={textareaStyle}
          />
          <button type="submit" style={dangerBtnStyle}>
            Confirmar glosa
          </button>
        </form>
      ) : null}
      <button type="button" onClick={() => setOpen(open === "hold" ? null : "hold")} style={linkBtnStyle}>
        Suspender
      </button>
      {open === "hold" ? (
        <form action={holdLine} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <input type="hidden" name="lineId" value={lineId} />
          <input type="hidden" name="studyId" value={studyId} />
          <input type="hidden" name="batchId" value={batchId} />
          <textarea
            name="reason"
            required
            rows={2}
            placeholder="Motivo da suspensao..."
            style={textareaStyle}
          />
          <button type="submit" style={warnBtnStyle}>
            Confirmar suspensao
          </button>
        </form>
      ) : null}
    </div>
  );
}

const linkBtnStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--color-primary)",
  background: "none",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
  padding: 0,
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 11,
  padding: 6,
  border: "1px solid var(--color-border)",
  borderRadius: 4,
  fontFamily: "inherit",
};

const dangerBtnStyle: React.CSSProperties = {
  fontSize: 11,
  padding: "4px 8px",
  background: "var(--color-danger)",
  color: "white",
  border: 0,
  borderRadius: 4,
  cursor: "pointer",
};

const warnBtnStyle: React.CSSProperties = {
  fontSize: 11,
  padding: "4px 8px",
  background: "#f59e0b",
  color: "white",
  border: 0,
  borderRadius: 4,
  cursor: "pointer",
};
