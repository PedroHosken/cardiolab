import { updateSubjectVisit } from "@/actions/subjectVisit";
import { PrimaryButton } from "@/components/Form";
import { StatusPill } from "@/components/StatusPill";
import {
  asOptionalValuesRecord,
  parseOptionalFieldDefs,
  summarizeOptionalValues,
  type VisitOptionalFieldDef,
} from "@/lib/visit-optional";
import type { SubjectVisit, VisitTemplate } from "@prisma/client";

type VisitWithTemplate = SubjectVisit & { visitTemplate: VisitTemplate };

export function SubjectVisitForm({
  visit,
  studyId,
  subjectId,
}: {
  visit: VisitWithTemplate;
  studyId: string;
  subjectId: string;
}) {
  const defs = parseOptionalFieldDefs(visit.visitTemplate.optionalFieldDefs);
  const values = asOptionalValuesRecord(visit.optionalValues);
  const dateStr = visit.visitDate
    ? new Date(visit.visitDate).toISOString().slice(0, 10)
    : "";

  const optionalSummary =
    defs.length > 0 ? summarizeOptionalValues(defs, values) : "";

  return (
    <form
      action={updateSubjectVisit}
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        padding: 14,
        background: "var(--color-surface)",
      }}
    >
      <input type="hidden" name="studyId" value={studyId} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="visitId" value={visit.id} />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, fontSize: 14 }}>
            {visit.visitTemplate.code}
          </div>
          <div style={{ fontSize: 13, color: "var(--color-foreground)", marginTop: 2 }}>
            {visit.visitTemplate.name}
          </div>
          {optionalSummary ? (
            <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 4 }}>
              {optionalSummary}
            </div>
          ) : null}
        </div>
        <StatusPill status={visit.status} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--color-muted)" }}>
          Data da visita
          <input
            type="date"
            name="visitDate"
            defaultValue={dateStr}
            style={{
              padding: "8px 10px",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              fontSize: 13,
            }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--color-muted)" }}>
          Realizacao
          <select
            name="status"
            defaultValue={visit.status}
            style={{
              padding: "8px 10px",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            {(
              [
                ["SCHEDULED", "Agendada / nao realizada"],
                ["COMPLETED", "Realizada"],
                ["MISSED", "Nao compareceu"],
                ["CANCELLED", "Cancelada"],
              ] as const
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {defs.length > 0 ? (
        <fieldset
          style={{
            border: "1px dashed var(--color-border)",
            borderRadius: 8,
            padding: "10px 12px",
            margin: "0 0 12px",
          }}
        >
          <legend style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", padding: "0 6px" }}>
            Campos opcionais desta visita
          </legend>
          <div style={{ display: "grid", gap: 10 }}>
            {defs.map((d) => (
              <OptionalFieldInput key={d.key} def={d} value={values[d.key]} />
            ))}
          </div>
        </fieldset>
      ) : null}

      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--color-muted)" }}>
        Notas da visita
        <textarea
          name="visitNotes"
          rows={3}
          placeholder="Ex.: janela OK, desvio de 1 dia autorizado por monitor; ECG de repeticao."
          defaultValue={visit.notes ?? ""}
          style={{
            padding: "8px 10px",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            fontSize: 13,
            fontFamily: "inherit",
            resize: "vertical",
          }}
        />
      </label>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
        <PrimaryButton>Salvar visita</PrimaryButton>
      </div>
    </form>
  );
}

function OptionalFieldInput({
  def,
  value,
}: {
  def: VisitOptionalFieldDef;
  value: unknown;
}) {
  const id = `opt_${def.key}`;
  if (def.type === "checkbox") {
    const checked = value === true || value === "true";
    return (
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
        <input type="checkbox" name={id} defaultChecked={checked} />
        {def.label}
      </label>
    );
  }
  if (def.type === "number") {
    const num = typeof value === "number" ? value : value != null && value !== "" ? Number(value) : "";
    return (
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--color-muted)" }}>
        {def.label}
        <input
          type="number"
          name={id}
          step="any"
          defaultValue={Number.isFinite(num as number) ? String(num) : ""}
          style={{
            padding: "8px 10px",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            fontSize: 13,
          }}
        />
      </label>
    );
  }
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--color-muted)" }}>
      {def.label}
      <input
        type="text"
        name={id}
        defaultValue={value != null ? String(value) : ""}
        style={{
          padding: "8px 10px",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          fontSize: 13,
        }}
      />
    </label>
  );
}
