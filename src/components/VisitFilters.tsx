"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";
import { VISIT_FILTER_LABELS, type VisitFilterKind } from "@/lib/visit-filters";

const QUICK_FILTERS: VisitFilterKind[] = [
  "day",
  "completed",
  "pending",
  "next15",
  "next30",
];

type SubjectOption = { id: string; subjectCode: string };

export function VisitFilters({
  studyId,
  subjects,
  activeFilter,
  activeSubjectId,
  rangeFrom,
  rangeTo,
}: {
  studyId: string;
  subjects: SubjectOption[];
  activeFilter: VisitFilterKind | null;
  activeSubjectId?: string;
  rangeFrom?: string;
  rangeTo?: string;
}) {
  const router = useRouter();
  const base = `/pesquisas/${studyId}/visitas`;

  const [patientId, setPatientId] = useState(activeSubjectId ?? "");
  const [from, setFrom] = useState(rangeFrom ?? "");
  const [to, setTo] = useState(rangeTo ?? "");

  const navigate = useCallback(
    (params: Record<string, string>) => {
      const q = new URLSearchParams(params);
      router.push(`${base}?${q.toString()}`);
    },
    [base, router]
  );

  function setFilter(f: VisitFilterKind, extra?: Record<string, string>) {
    navigate({ f, ...extra });
  }

  function clearFilter() {
    router.push(base);
  }

  function onPatientSubmit(e: FormEvent) {
    e.preventDefault();
    if (!patientId) return;
    setFilter("patient", { subjectId: patientId });
  }

  function onRangeSubmit(e: FormEvent) {
    e.preventDefault();
    if (!from || !to) return;
    setFilter("range", { from, to });
  }

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: "7px 12px",
    fontSize: 12,
    fontWeight: active ? 600 : 500,
    borderRadius: 6,
    border: active ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
    background: active ? "#ecfeff" : "var(--color-surface)",
    color: active ? "var(--color-primary)" : "var(--color-foreground)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {QUICK_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={btnStyle(activeFilter === f)}
          >
            {VISIT_FILTER_LABELS[f]}
          </button>
        ))}
        {activeFilter ? (
          <button type="button" onClick={clearFilter} style={{ ...btnStyle(false), color: "var(--color-muted)" }}>
            Limpar filtro
          </button>
        ) : null}
      </div>

      <form
        onSubmit={onPatientSubmit}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "flex-end",
          marginTop: 12,
          padding: 12,
          border: "1px solid var(--color-border)",
          borderRadius: 8,
          background: activeFilter === "patient" ? "#f8fafc" : "var(--color-surface)",
        }}
      >
        <label style={{ flex: 1, minWidth: 200, fontSize: 11, color: "var(--color-muted)" }}>
          {VISIT_FILTER_LABELS.patient}
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              marginTop: 4,
              padding: "8px 10px",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            <option value="">Selecione o paciente...</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.subjectCode}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" style={btnStyle(activeFilter === "patient")} disabled={!patientId}>
          Filtrar paciente
        </button>
      </form>

      <form
        onSubmit={onRangeSubmit}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "flex-end",
          marginTop: 10,
          padding: 12,
          border: "1px solid var(--color-border)",
          borderRadius: 8,
          background: activeFilter === "range" ? "#f8fafc" : "var(--color-surface)",
        }}
      >
        <label style={{ fontSize: 11, color: "var(--color-muted)" }}>
          Data inicio
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{
              display: "block",
              marginTop: 4,
              padding: "8px 10px",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              fontSize: 13,
            }}
          />
        </label>
        <label style={{ fontSize: 11, color: "var(--color-muted)" }}>
          Data fim
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{
              display: "block",
              marginTop: 4,
              padding: "8px 10px",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              fontSize: 13,
            }}
          />
        </label>
        <button type="submit" style={btnStyle(activeFilter === "range")} disabled={!from || !to}>
          {VISIT_FILTER_LABELS.range}
        </button>
      </form>

      {activeFilter ? (
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--color-muted)" }}>
          Filtro ativo: <strong>{VISIT_FILTER_LABELS[activeFilter]}</strong>
          {activeFilter === "patient" && activeSubjectId
            ? ` · ${subjects.find((s) => s.id === activeSubjectId)?.subjectCode ?? ""}`
            : null}
          {activeFilter === "range" && rangeFrom && rangeTo ? ` · ${rangeFrom} a ${rangeTo}` : null}
        </p>
      ) : null}
    </div>
  );
}

