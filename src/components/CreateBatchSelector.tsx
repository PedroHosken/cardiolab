"use client";

import { useMemo, useState } from "react";
import { createBatchFromLines } from "@/app/pesquisas/[id]/lotes/actions";
import { PrimaryButton } from "@/components/Form";
import { billingModeLabel, type BillingMode } from "@/lib/billing-mode";
import { formatDate, formatMoney } from "@/lib/format";

export type PendingLineRow = {
  id: string;
  occurredAt: string;
  subjectCode: string | null;
  procedureName: string;
  grossAmount: number;
  netAmount: number;
  currency: string;
  budgetItemId: string;
};

export function CreateBatchSelector({
  studyId,
  billingMode,
  lines,
  defaultMonth,
}: {
  studyId: string;
  billingMode: BillingMode;
  lines: PendingLineRow[];
  defaultMonth: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(lines.map((l) => l.id)));
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [itemFilter, setItemFilter] = useState("");

  const items = useMemo(() => {
    const names = new Map<string, string>();
    for (const l of lines) names.set(l.budgetItemId, l.procedureName);
    return [...names.entries()].map(([id, name]) => ({ id, name }));
  }, [lines]);

  const filtered = useMemo(() => {
    return lines.filter((l) => {
      const d = l.occurredAt.slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (itemFilter && l.budgetItemId !== itemFilter) return false;
      return true;
    });
  }, [lines, dateFrom, dateTo, itemFilter]);

  const selectedInView = filtered.filter((l) => selected.has(l.id));
  const previewNet = selectedInView.reduce((s, l) => s + l.netAmount, 0);
  const currency = lines[0]?.currency ?? "USD";

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const l of filtered) next.add(l.id);
      return next;
    });
  }

  function clearAll() {
    setSelected(new Set());
  }

  return (
    <form action={createBatchFromLines}>
      <input type="hidden" name="studyId" value={studyId} />
      <input type="hidden" name="billingMode" value={billingMode} />

      <p style={{ fontSize: 13, margin: "0 0 12px", color: "var(--color-muted)" }}>
        Modalidade: <strong>{billingModeLabel(billingMode)}</strong> — selecione os lancamentos que
        entrarao neste lote (proforma / invoice).
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "flex-end",
          marginBottom: 14,
          padding: 12,
          border: "1px solid var(--color-border)",
          borderRadius: 8,
        }}
      >
        <label style={{ fontSize: 11, color: "var(--color-muted)" }}>
          Data inicio
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ fontSize: 11, color: "var(--color-muted)" }}>
          Data fim
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ fontSize: 11, color: "var(--color-muted)", minWidth: 180 }}>
          Procedimento
          <select value={itemFilter} onChange={(e) => setItemFilter(e.target.value)} style={inputStyle}>
            <option value="">Todos</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 11, color: "var(--color-muted)" }}>
          Mes referencia do lote
          <input
            type="month"
            name="referenceMonth"
            defaultValue={defaultMonth}
            style={inputStyle}
          />
        </label>
        <button type="button" onClick={selectAllVisible} style={secondaryBtn}>
          Marcar visiveis
        </button>
        <button type="button" onClick={clearAll} style={secondaryBtn}>
          Limpar
        </button>
      </div>

      <div style={{ maxHeight: 420, overflow: "auto", border: "1px solid var(--color-border)", borderRadius: 8 }}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead style={{ position: "sticky", top: 0, background: "var(--color-surface)" }}>
            <tr>
              <th style={thStyle} />
              <th style={thStyle}>Data</th>
              <th style={thStyle}>Paciente</th>
              <th style={thStyle}>Procedimento</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Liquido</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 20, textAlign: "center", color: "var(--color-muted)" }}>
                  Nenhum lancamento pendente neste filtro.
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={tdStyle}>
                    <input
                      type="checkbox"
                      checked={selected.has(l.id)}
                      onChange={() => toggle(l.id)}
                    />
                  </td>
                  <td style={tdStyle}>{formatDate(l.occurredAt)}</td>
                  <td style={tdStyle}>{l.subjectCode ?? "—"}</td>
                  <td style={tdStyle}>{l.procedureName}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace" }}>
                    {formatMoney(l.netAmount, l.currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {filtered.map((l) =>
        selected.has(l.id) ? <input key={`h-${l.id}`} type="hidden" name="lineIds" value={l.id} /> : null
      )}

      <div
        style={{
          marginTop: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 13 }}>
          <strong>{selectedInView.length}</strong> linha(s) selecionada(s) · Liquido:{" "}
          <strong>{formatMoney(previewNet, currency)}</strong>
        </div>
        <PrimaryButton disabled={selectedInView.length === 0}>
          Criar lote em rascunho
        </PrimaryButton>
      </div>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  marginTop: 4,
  padding: "7px 10px",
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  fontSize: 13,
};

const secondaryBtn: React.CSSProperties = {
  padding: "7px 12px",
  fontSize: 12,
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  background: "var(--color-surface)",
  cursor: "pointer",
};

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--color-muted)",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
};
