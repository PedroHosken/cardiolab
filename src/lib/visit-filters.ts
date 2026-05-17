import { visitWindow } from "@/lib/visit-kind";

export type VisitFilterKind =
  | "day"
  | "patient"
  | "completed"
  | "pending"
  | "next15"
  | "next30"
  | "range";

export const VISIT_FILTER_LABELS: Record<VisitFilterKind, string> = {
  day: "Visitas do dia",
  patient: "Visitas do paciente",
  completed: "Visitas realizadas",
  pending: "Visitas pendentes (na janela)",
  next15: "Proximos 15 dias",
  next30: "Proximos 30 dias",
  range: "Periodo customizado",
};

export function dateKey(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysToKey(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type VisitRow = {
  visitDate: Date | null;
  status: string;
  subjectId: string;
  visitTemplate: { windowDays: number | null };
};

export function isVisitCompleted(status: string): boolean {
  return status === "COMPLETED";
}

export function isVisitOpen(status: string): boolean {
  return status === "SCHEDULED";
}

/** Hoje dentro da janela da visita e ainda nao realizada. */
export function isPendingInWindow(visit: VisitRow, refKey = todayKey()): boolean {
  if (!isVisitOpen(visit.status)) return false;
  const centerKey = dateKey(visit.visitDate);
  if (!centerKey) return false;

  const center = new Date(`${centerKey}T12:00:00`);
  const window = visitWindow(center, visit.visitTemplate.windowDays);
  if (!window) return centerKey <= refKey;

  const startKey = dateKey(window.start);
  const endKey = dateKey(window.end);
  if (!startKey || !endKey) return false;
  return refKey >= startKey && refKey <= endKey;
}

export function matchesVisitFilter(
  visit: VisitRow,
  filter: VisitFilterKind,
  opts: {
    today?: string;
    subjectId?: string;
    from?: string;
    to?: string;
  } = {}
): boolean {
  const today = opts.today ?? todayKey();
  const visitKey = dateKey(visit.visitDate);

  switch (filter) {
    case "day":
      return visitKey === today;
    case "patient":
      return opts.subjectId ? visit.subjectId === opts.subjectId : false;
    case "completed":
      return isVisitCompleted(visit.status);
    case "pending":
      return isPendingInWindow(visit, today);
    case "next15": {
      if (!isVisitOpen(visit.status) || !visitKey) return false;
      const end = addDaysToKey(today, 15);
      return visitKey >= today && visitKey <= end;
    }
    case "next30": {
      if (!isVisitOpen(visit.status) || !visitKey) return false;
      const end = addDaysToKey(today, 30);
      return visitKey >= today && visitKey <= end;
    }
    case "range": {
      if (!visitKey || !opts.from || !opts.to) return false;
      return visitKey >= opts.from && visitKey <= opts.to;
    }
    default:
      return true;
  }
}

export function parseVisitFilter(
  raw: string | undefined
): VisitFilterKind | null {
  const allowed: VisitFilterKind[] = [
    "day",
    "patient",
    "completed",
    "pending",
    "next15",
    "next30",
    "range",
  ];
  if (raw && allowed.includes(raw as VisitFilterKind)) {
    return raw as VisitFilterKind;
  }
  return null;
}
