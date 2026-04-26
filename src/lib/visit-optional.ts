export type VisitOptionalFieldType = "checkbox" | "text" | "number";

export interface VisitOptionalFieldDef {
  key: string;
  label: string;
  type: VisitOptionalFieldType;
}

function parseJsonUnknown(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

export function parseOptionalFieldDefs(raw: unknown): VisitOptionalFieldDef[] {
  const data = parseJsonUnknown(raw);
  if (!Array.isArray(data)) return [];
  const out: VisitOptionalFieldDef[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const key = String(o.key ?? "").trim();
    const label = String(o.label ?? "").trim();
    const type: VisitOptionalFieldType =
      o.type === "text" || o.type === "number" ? o.type : "checkbox";
    if (!key || !label) continue;
    out.push({ key, label, type });
  }
  return out;
}

export function asOptionalValuesRecord(raw: unknown): Record<string, unknown> {
  const data = parseJsonUnknown(raw);
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  return { ...(data as Record<string, unknown>) };
}

export function buildOptionalValuesFromForm(
  formData: FormData,
  defs: VisitOptionalFieldDef[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const d of defs) {
    const name = `opt_${d.key}`;
    if (d.type === "checkbox") {
      out[d.key] = formData.get(name) === "on";
    } else if (d.type === "number") {
      const v = formData.get(name);
      if (v === null || v === "") out[d.key] = null;
      else {
        const n = Number(v);
        out[d.key] = Number.isFinite(n) ? n : null;
      }
    } else {
      const v = String(formData.get(name) ?? "").trim();
      out[d.key] = v || null;
    }
  }
  return out;
}

/** Resumo curto para listagens (opcionais marcados / texto). */
export function summarizeOptionalValues(
  defs: VisitOptionalFieldDef[],
  values: Record<string, unknown>
): string {
  const parts: string[] = [];
  for (const d of defs) {
    const v = values[d.key];
    if (v === undefined || v === null || v === "") continue;
    if (d.type === "checkbox" && v === true) parts.push(d.label);
    else if (d.type !== "checkbox") parts.push(`${d.label}: ${String(v)}`);
  }
  return parts.length ? parts.join(" · ") : "";
}
