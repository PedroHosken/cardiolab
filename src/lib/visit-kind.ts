export type VisitKind = "SCREENING" | "RANDOMIZATION" | "FOLLOWUP";

export const VISIT_KIND_OPTIONS: Array<{ value: VisitKind; label: string; hint: string }> = [
  {
    value: "SCREENING",
    label: "Triagem",
    hint: "Acontece antes da randomizacao. Use dias negativos (ex.: -28).",
  },
  {
    value: "RANDOMIZATION",
    label: "Randomizacao",
    hint: "Visita zero. Tempo de seguimento = 0 dias.",
  },
  {
    value: "FOLLOWUP",
    label: "Visita de seguimento",
    hint: "Apos a randomizacao. Tempo de seguimento positivo.",
  },
];

export function visitKindLabel(kind: string | null | undefined): string {
  return VISIT_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? "—";
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Janela inicio/fim a partir de um centro e um numero de dias +/-. */
export function visitWindow(center: Date, windowDays: number | null | undefined): {
  start: Date;
  end: Date;
} | null {
  if (windowDays == null || !Number.isFinite(windowDays)) return null;
  const w = Math.max(0, Math.floor(windowDays));
  return { start: addDays(center, -w), end: addDays(center, +w) };
}
