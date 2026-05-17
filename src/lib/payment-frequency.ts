export type PaymentFrequency =
  | "MONTHLY"
  | "BIMONTHLY"
  | "QUARTERLY"
  | "QUADRIMONTHLY"
  | "SEMIANNUAL"
  | "ANNUAL";

export const PAYMENT_FREQUENCIES: Array<{
  value: PaymentFrequency;
  label: string;
  months: number;
}> = [
  { value: "MONTHLY", label: "Mensal (1 mes)", months: 1 },
  { value: "BIMONTHLY", label: "Bimestral (2 meses)", months: 2 },
  { value: "QUARTERLY", label: "Trimestral (3 meses)", months: 3 },
  { value: "QUADRIMONTHLY", label: "Quadrimestral (4 meses)", months: 4 },
  { value: "SEMIANNUAL", label: "Semestral (6 meses)", months: 6 },
  { value: "ANNUAL", label: "Anual (12 meses)", months: 12 },
];

export function paymentFrequencyMonths(value: string | null | undefined): number | null {
  const f = PAYMENT_FREQUENCIES.find((p) => p.value === value);
  return f ? f.months : null;
}

export function paymentFrequencyLabel(value: string | null | undefined): string {
  return PAYMENT_FREQUENCIES.find((p) => p.value === value)?.label ?? "—";
}

/**
 * Soma N meses preservando o dia (com clamp para o ultimo dia do mes destino).
 */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  const target = new Date(d.getFullYear(), targetMonth, 1, 12, 0, 0);
  const lastDayOfTarget = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), lastDayOfTarget));
  return target;
}

export interface PaymentPeriod {
  index: number; // 1, 2, 3...
  start: Date; // inclusive
  end: Date; // exclusive (proxima data)
  dueDate: Date; // mesma de end
}

/**
 * Gera os periodos de pagamento a partir da data de inicio + frequencia,
 * ate a data de referencia (default: hoje + 30 dias).
 */
export function buildPaymentPeriods(
  startDate: Date,
  frequency: PaymentFrequency,
  until: Date = new Date(Date.now() + 30 * 24 * 3600 * 1000)
): PaymentPeriod[] {
  const months = paymentFrequencyMonths(frequency);
  if (!months) return [];
  const periods: PaymentPeriod[] = [];
  let cursor = new Date(startDate);
  let i = 1;
  while (cursor < until && i < 240) {
    const next = addMonths(cursor, months);
    periods.push({ index: i, start: new Date(cursor), end: new Date(next), dueDate: new Date(next) });
    cursor = next;
    i += 1;
  }
  return periods;
}

/** Periodo atualmente vencido (dueDate <= hoje) e nao ainda quitado. */
export function nextDuePeriod(
  startDate: Date,
  frequency: PaymentFrequency,
  today: Date = new Date()
): PaymentPeriod | null {
  const periods = buildPaymentPeriods(startDate, frequency, addMonths(today, 1));
  return periods.find((p) => p.dueDate <= today) ?? null;
}

/** Proximo periodo futuro (dueDate > hoje). */
export function upcomingPeriod(
  startDate: Date,
  frequency: PaymentFrequency,
  today: Date = new Date()
): PaymentPeriod | null {
  const periods = buildPaymentPeriods(startDate, frequency, addMonths(today, 13));
  return periods.find((p) => p.dueDate > today) ?? null;
}
