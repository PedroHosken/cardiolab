import { visitStatusLabel } from "@/lib/format";

const TONE_BY_STATUS: Record<string, string> = {
  SCHEDULED: "pill-info",
  COMPLETED: "pill-success",
  MISSED: "pill-warning",
  CANCELLED: "pill-neutral",
};

export function VisitStatusPill({ status }: { status: string }) {
  const tone = TONE_BY_STATUS[status] ?? "pill-neutral";
  return <span className={`pill ${tone}`}>{visitStatusLabel(status)}</span>;
}
