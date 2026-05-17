import { formatDate, formatMoney, statusLabel } from "@/lib/format";
import { billingModeLabel } from "@/lib/billing-mode";
import type { ProformaExportPayload } from "@/lib/proforma-export-types";
import type { ProformaLine } from "@/components/ProformaTable";

export function buildProformaExportPayload(opts: {
  batchNumber: string;
  studyTitle: string;
  protocolNumber: string;
  referenceMonth: string | null;
  currency: string;
  billingMode: string;
  batchStatus: string;
  submittedAt: Date | null;
  proformaNotes: string | null;
  lines: ProformaLine[];
}): ProformaExportPayload {
  const totals = opts.lines.reduce(
    (acc, l) => {
      acc.gross += l.grossAmount;
      acc.hold += l.holdbackAmount;
      acc.net += l.netAmount;
      return acc;
    },
    { gross: 0, hold: 0, net: 0 }
  );

  return {
    batchNumber: opts.batchNumber,
    studyTitle: opts.studyTitle,
    protocolNumber: opts.protocolNumber,
    referenceMonth: opts.referenceMonth,
    currency: opts.currency,
    billingModeLabel: billingModeLabel(opts.billingMode),
    batchStatusLabel: statusLabel(opts.batchStatus),
    submittedAt: opts.submittedAt ? formatDate(opts.submittedAt) : null,
    proformaNotes: opts.proformaNotes,
    lines: opts.lines.map((l) => ({
      subjectCode: l.subjectCode ?? "—",
      visitDate: formatDate(l.visitDate ?? l.occurredAt),
      procedureName: l.procedureName,
      description: l.description,
      grossAmount: l.grossAmount,
      holdbackAmount: l.holdbackAmount,
      netAmount: l.netAmount,
      grossFormatted: formatMoney(l.grossAmount, l.currency),
      holdbackFormatted: formatMoney(l.holdbackAmount, l.currency),
      netFormatted: formatMoney(l.netAmount, l.currency),
    })),
    totals,
  };
}
