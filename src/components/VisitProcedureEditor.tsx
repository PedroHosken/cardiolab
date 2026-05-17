"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { saveSubjectVisit } from "@/actions/subjectVisit";
import { PrimaryButton } from "@/components/Form";
import { VisitStatusPill } from "@/components/VisitStatusPill";
import { formatDateMed, formatMoney } from "@/lib/format";
import { visitKindLabel, visitWindow } from "@/lib/visit-kind";

export type CatalogItemRow = {
  id: string;
  code: string;
  name: string;
  unitAmount: number;
};

export type AdHocRow = {
  name: string;
  unitAmount: number;
  description: string;
};

type Props = {
  studyId: string;
  subjectId: string;
  visitId: string;
  visitCode: string;
  visitName: string;
  visitKind: string;
  visitStatus: string;
  visitDate: string | null;
  scheduledDate: string | null;
  windowDays: number | null;
  notes: string | null;
  currency: string;
  linkedItems: CatalogItemRow[];
  initialPerformedIds: string[];
  initialExtraIds: string[];
  initialAdHoc: AdHocRow[];
  catalogPool: CatalogItemRow[];
  lockedLineCount: number;
  isCompleted: boolean;
};

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: "8px 10px",
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  fontSize: 13,
};

const secondaryBtnStyle: CSSProperties = {
  padding: "8px 14px",
  fontSize: 12,
  fontWeight: 600,
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  background: "var(--color-surface)",
  cursor: "pointer",
};

const removeBtnStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--color-danger)",
  background: "none",
  border: "none",
  cursor: "pointer",
};

function procedureRowStyle(checked: boolean, highlight = true): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    background: checked && highlight ? "#f0fdf4" : "var(--color-surface)",
  };
}

function ItemMeta({
  code,
  name,
  amount,
  currency,
}: {
  code: string;
  name: string;
  amount: number;
  currency: string;
}) {
  return (
    <>
      <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
      <div style={{ fontSize: 11, color: "var(--color-muted)" }}>
        {code} · {formatMoney(amount, currency)} (unit.)
      </div>
    </>
  );
}

export function VisitProcedureEditor(props: Props) {
  const {
    studyId,
    subjectId,
    visitId,
    visitCode,
    visitName,
    visitKind,
    visitStatus,
    visitDate,
    scheduledDate,
    windowDays,
    notes,
    currency,
    linkedItems,
    initialPerformedIds,
    initialExtraIds,
    initialAdHoc,
    catalogPool,
    lockedLineCount,
    isCompleted,
  } = props;

  const [performed, setPerformed] = useState<Set<string>>(() => new Set(initialPerformedIds));
  const [extras, setExtras] = useState<CatalogItemRow[]>(() =>
    catalogPool.filter((c) => initialExtraIds.includes(c.id))
  );
  const [adhoc, setAdhoc] = useState<AdHocRow[]>(initialAdHoc);
  const [pickExtraId, setPickExtraId] = useState("");
  const [showExtraPicker, setShowExtraPicker] = useState(false);
  const payloadRef = useRef<HTMLInputElement>(null);

  const windowRange = useMemo(() => {
    if (!scheduledDate || windowDays == null) return null;
    return visitWindow(new Date(scheduledDate), windowDays);
  }, [scheduledDate, windowDays]);

  const linkedIds = useMemo(() => new Set(linkedItems.map((i) => i.id)), [linkedItems]);
  const availableExtras = catalogPool.filter(
    (c) => !linkedIds.has(c.id) && !extras.some((e) => e.id === c.id)
  );

  const procedurePayload = useMemo(
    () => ({
      performedIds: [...performed],
      extraIds: extras.map((e) => e.id),
      adhoc: adhoc.filter((a) => a.name.trim() && a.unitAmount > 0),
    }),
    [performed, extras, adhoc]
  );

  useEffect(() => {
    if (payloadRef.current) {
      payloadRef.current.value = JSON.stringify(procedurePayload);
    }
  }, [procedurePayload]);

  const previewTotal = useMemo(() => {
    let sum = 0;
    for (const id of performed) {
      const item = linkedItems.find((i) => i.id === id) ?? extras.find((i) => i.id === id);
      if (item) sum += item.unitAmount;
    }
    for (const row of adhoc) sum += row.unitAmount || 0;
    return sum;
  }, [performed, linkedItems, extras, adhoc]);

  function togglePerformed(id: string) {
    setPerformed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addExtra() {
    const item = catalogPool.find((c) => c.id === pickExtraId);
    if (!item || extras.some((e) => e.id === item.id)) return;
    setExtras((e) => [...e, item]);
    setPerformed((p) => new Set(p).add(item.id));
    setPickExtraId("");
    setShowExtraPicker(false);
  }

  function removeExtra(id: string) {
    setExtras((e) => e.filter((x) => x.id !== id));
    setPerformed((p) => {
      const next = new Set(p);
      next.delete(id);
      return next;
    });
  }

  return (
    <form action={saveSubjectVisit}>
      <input type="hidden" name="studyId" value={studyId} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="visitId" value={visitId} />
      <input
        ref={payloadRef}
        type="hidden"
        name="procedurePayload"
        defaultValue={JSON.stringify(procedurePayload)}
      />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, fontSize: 16 }}>
            {visitCode}
            <span style={{ fontFamily: "inherit", fontSize: 12, color: "var(--color-muted)", marginLeft: 8 }}>
              · {visitKindLabel(visitKind)}
            </span>
          </div>
          <div style={{ fontSize: 14, marginTop: 4 }}>{visitName}</div>
          {scheduledDate ? (
            <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 6 }}>
              Programada: {formatDateMed(scheduledDate)}
              {windowRange ? (
                <>
                  {" "}
                  · Janela: {formatDateMed(windowRange.start)} a {formatDateMed(windowRange.end)}
                </>
              ) : null}
            </div>
          ) : null}
        </div>
        <VisitStatusPill status={visitStatus} />
      </div>

      {lockedLineCount > 0 ? (
        <LockedBanner count={lockedLineCount} />
      ) : null}

      <label
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          fontSize: 11,
          color: "var(--color-muted)",
          marginBottom: 16,
          maxWidth: 220,
        }}
      >
        Data da visita (realizacao)
        <input
          type="date"
          name="visitDate"
          required
          defaultValue={visitDate ?? scheduledDate ?? new Date().toISOString().slice(0, 10)}
          style={inputStyle}
        />
      </label>

      <section style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>
          Procedimentos previstos nesta visita
        </h3>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--color-muted)" }}>
          Todos vêm marcados como realizados. Desmarque o que não foi feito.
        </p>
        {linkedItems.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--color-muted)" }}>
            Nenhum item faturavel vinculado a esta visita no cronograma.
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {linkedItems.map((item) => (
              <li key={item.id} style={procedureRowStyle(performed.has(item.id))}>
                <input
                  type="checkbox"
                  checked={performed.has(item.id)}
                  onChange={() => togglePerformed(item.id)}
                  id={`proc-${item.id}`}
                />
                <label htmlFor={`proc-${item.id}`} style={{ flex: 1, cursor: "pointer" }}>
                  <ItemMeta code={item.code} name={item.name} amount={item.unitAmount} currency={currency} />
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      {extras.length > 0 ? (
        <section style={{ marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>
            Procedimentos adicionais (catalogo)
          </h3>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {extras.map((item) => (
              <li key={item.id} style={procedureRowStyle(performed.has(item.id), false)}>
                <input
                  type="checkbox"
                  checked={performed.has(item.id)}
                  onChange={() => togglePerformed(item.id)}
                  id={`extra-${item.id}`}
                />
                <label htmlFor={`extra-${item.id}`} style={{ flex: 1, cursor: "pointer" }}>
                  <ItemMeta code={item.code} name={item.name} amount={item.unitAmount} currency={currency} />
                </label>
                <button type="button" onClick={() => removeExtra(item.id)} style={removeBtnStyle}>
                  Remover
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <button type="button" onClick={() => setShowExtraPicker((v) => !v)} style={secondaryBtnStyle}>
          + Adicionar procedimento do catalogo
        </button>
        <button
          type="button"
          onClick={() => setAdhoc((rows) => [...rows, { name: "", unitAmount: 0, description: "" }])}
          style={secondaryBtnStyle}
        >
          + Procedimento nao cadastrado
        </button>
      </div>

      {showExtraPicker ? (
        <div
          style={{
            marginBottom: 20,
            padding: 12,
            border: "1px dashed var(--color-border)",
            borderRadius: 8,
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "flex-end",
          }}
        >
          <label style={{ flex: 1, minWidth: 200, fontSize: 11, color: "var(--color-muted)" }}>
            Procedimento do catalogo da pesquisa
            <select
              value={pickExtraId}
              onChange={(e) => setPickExtraId(e.target.value)}
              style={inputStyle}
            >
              <option value="">Selecione...</option>
              {availableExtras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={addExtra} style={secondaryBtnStyle} disabled={!pickExtraId}>
            Incluir
          </button>
          <button
            type="button"
            onClick={() => setShowExtraPicker(false)}
            style={{ ...secondaryBtnStyle, background: "transparent" }}
          >
            Cancelar
          </button>
        </div>
      ) : null}

      {adhoc.length > 0 ? (
        <section style={{ marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>
            Procedimentos autorizados (fora do contrato)
          </h3>
          <div style={{ display: "grid", gap: 12 }}>
            {adhoc.map((row, idx) => (
              <div
                key={idx}
                style={{
                  padding: 12,
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  display: "grid",
                  gridTemplateColumns: "1fr 140px",
                  gap: 10,
                }}
              >
                <label style={{ fontSize: 11, color: "var(--color-muted)" }}>
                  Nome do procedimento
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => {
                      const next = [...adhoc];
                      next[idx] = { ...row, name: e.target.value };
                      setAdhoc(next);
                    }}
                    style={inputStyle}
                  />
                </label>
                <label style={{ fontSize: 11, color: "var(--color-muted)" }}>
                  Valor ({currency})
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.unitAmount || ""}
                    onChange={(e) => {
                      const next = [...adhoc];
                      next[idx] = { ...row, unitAmount: parseFloat(e.target.value) || 0 };
                      setAdhoc(next);
                    }}
                    style={inputStyle}
                  />
                </label>
                <label style={{ gridColumn: "1 / -1", fontSize: 11, color: "var(--color-muted)" }}>
                  Descricao / justificativa
                  <textarea
                    rows={2}
                    value={row.description}
                    onChange={(e) => {
                      const next = [...adhoc];
                      next[idx] = { ...row, description: e.target.value };
                      setAdhoc(next);
                    }}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setAdhoc(adhoc.filter((_, i) => i !== idx))}
                  style={{ ...removeBtnStyle, gridColumn: "1 / -1" }}
                >
                  Remover procedimento avulso
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <label
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          fontSize: 11,
          color: "var(--color-muted)",
          marginBottom: 16,
        }}
      >
        Observacoes da visita
        <textarea
          name="visitNotes"
          rows={4}
          placeholder="Ex.: procedimentos previstos e nao realizados devido a evento adverso; falta de material do patrocinador."
          defaultValue={notes ?? ""}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </label>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          paddingTop: 12,
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
          Estimativa bruta (sem holdback):{" "}
          <strong style={{ color: "var(--color-foreground)" }}>
            {formatMoney(previewTotal, currency)}
          </strong>
          {isCompleted ? (
            <span style={{ display: "block", marginTop: 4 }}>
              Ao salvar, os lancamentos editaveis serao recalculados.
            </span>
          ) : (
            <span style={{ display: "block", marginTop: 4 }}>
              Ao salvar, a visita passara para o status <strong>Realizada</strong>.
            </span>
          )}
        </div>
        <PrimaryButton>{isCompleted ? "Salvar e atualizar valores" : "Salvar visita"}</PrimaryButton>
      </div>
    </form>
  );
}

function LockedBanner({ count }: { count: number }) {
  return (
    <div
      style={{
        marginBottom: 14,
        padding: "10px 12px",
        borderRadius: 8,
        background: "#fffbeb",
        border: "1px solid #fcd34d",
        fontSize: 12,
        color: "#92400e",
      }}
    >
      {count} lancamento(s) desta visita ja estao em lote/faturados e nao serao alterados. Novos
      procedimentos gerarao linhas adicionais ao salvar.
    </div>
  );
}
