import type { ProformaLine } from "@/components/ProformaTable";

type LineWithRelations = {
  id: string;
  occurredAt: Date;
  description: string | null;
  grossAmount: number;
  holdbackAmount: number;
  netAmount: number;
  currency: string;
  budgetItem: { name: string };
  subject: { id: string; subjectCode: string } | null;
  subjectVisit: {
    visitDate: Date | null;
    visitTemplate: { code: string };
  } | null;
};

export function toProformaLines(lines: LineWithRelations[]): ProformaLine[] {
  return lines.map((l) => ({
    id: l.id,
    occurredAt: l.occurredAt,
    subjectCode: l.subject?.subjectCode ?? null,
    subjectId: l.subject?.id ?? null,
    visitDate: l.subjectVisit?.visitDate ?? l.occurredAt,
    procedureName: l.budgetItem.name,
    description: l.description,
    grossAmount: l.grossAmount,
    holdbackAmount: l.holdbackAmount,
    netAmount: l.netAmount,
    currency: l.currency,
  }));
}
