export type BillingMode = "SPONSOR_EDC" | "SITE_PASS_THROUGH";

export const BILLING_MODE_OPTIONS: Array<{
  value: BillingMode;
  label: string;
  hint: string;
}> = [
  {
    value: "SPONSOR_EDC",
    label: "Proforma do patrocinador (EDC)",
    hint:
      "O patrocinador informa o que pagara. Voce marca os procedimentos que entram no seu invoice.",
  },
  {
    value: "SITE_PASS_THROUGH",
    label: "Pass-through (centro gera proforma)",
    hint:
      "O centro monta e envia o proforma invoice ao patrocinador (ex.: exames com NF).",
  },
];

export function billingModeLabel(mode: string | null | undefined): string {
  return BILLING_MODE_OPTIONS.find((o) => o.value === mode)?.label ?? mode ?? "—";
}

export function parseBillingMode(raw: string | null | undefined): BillingMode {
  return raw === "SITE_PASS_THROUGH" ? "SITE_PASS_THROUGH" : "SPONSOR_EDC";
}

export function requiresInvoiceFromMode(mode: BillingMode): boolean {
  return mode === "SITE_PASS_THROUGH";
}
