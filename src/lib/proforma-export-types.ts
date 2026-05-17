/** Dados serializaveis do proforma para exportacao no cliente. */
export type ProformaExportPayload = {
  batchNumber: string;
  studyTitle: string;
  protocolNumber: string;
  referenceMonth: string | null;
  currency: string;
  billingModeLabel: string;
  batchStatusLabel: string;
  submittedAt: string | null;
  proformaNotes: string | null;
  lines: ProformaExportLine[];
  totals: { gross: number; hold: number; net: number };
};

export type ProformaExportLine = {
  subjectCode: string;
  visitDate: string;
  procedureName: string;
  description: string | null;
  grossAmount: number;
  holdbackAmount: number;
  netAmount: number;
  grossFormatted: string;
  holdbackFormatted: string;
  netFormatted: string;
};

export function proformaFileBaseName(batchNumber: string): string {
  return `proforma-${batchNumber.replace(/[^\w.-]+/g, "_")}`;
}
