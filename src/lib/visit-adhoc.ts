import type { AdHocRow } from "@/components/VisitProcedureEditor";

/** Extrai procedimento avulso a partir da descricao da linha faturavel. */
export function parseAdHocFromLine(
  description: string | null | undefined,
  grossAmount: number,
  quantity: number
): AdHocRow | null {
  if (!description?.startsWith("[Avulso]")) return null;
  const body = description.replace(/^\[Avulso\]\s*/, "");
  const obsSplit = body.split(/\s+\|\s+Obs\. visita:/);
  const main = obsSplit[0] ?? body;
  const parts = main.split(/\s+—\s+/);
  const name = parts[0]?.trim() ?? "";
  const detail = parts[1]?.trim() ?? "";
  const qty = quantity || 1;
  return {
    name,
    description: detail,
    unitAmount: qty > 0 ? grossAmount / qty : grossAmount,
  };
}

export function isAdHocLine(description: string | null | undefined): boolean {
  return Boolean(description?.startsWith("[Avulso]"));
}
