import { statusLabel } from "@/lib/format";

const TONE_BY_STATUS: Record<string, string> = {
  // Subjects
  ACTIVE: "pill-success",
  RANDOMIZED: "pill-info",
  SCREENING: "pill-neutral",
  SCREEN_FAIL: "pill-danger",
  DISCONTINUED: "pill-warning",
  COMPLETED: "pill-success",
  // Visits
  SCHEDULED: "pill-info",
  MISSED: "pill-warning",
  CANCELLED: "pill-neutral",
  // Lines
  DRAFT: "pill-neutral",
  READY: "pill-primary",
  IN_BATCH: "pill-info",
  INVOICED: "pill-info",
  PAID: "pill-success",
  HELD: "pill-warning",
  GLOSSED: "pill-danger",
  WRITTEN_OFF: "pill-danger",
  // Batches
  SUBMITTED: "pill-info",
  PARTIALLY_PAID: "pill-warning",
  DISPUTED: "pill-danger",
  // Studies
  PLANNING: "pill-neutral",
  ON_HOLD: "pill-warning",
  CLOSED: "pill-neutral",
};

export function StatusPill({ status }: { status: string }) {
  const tone = TONE_BY_STATUS[status] ?? "pill-neutral";
  return <span className={`pill ${tone}`}>{statusLabel(status)}</span>;
}
