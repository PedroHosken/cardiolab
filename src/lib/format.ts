export function formatMoney(value: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export const STATUS_LABELS: Record<string, string> = {
  // Subject
  SCREENING: "Triagem",
  SCREEN_FAIL: "Falha de triagem",
  RANDOMIZED: "Randomizado",
  ACTIVE: "Ativo",
  DISCONTINUED: "Descontinuado",
  COMPLETED: "Concluido",
  // Visit
  SCHEDULED: "Agendada",
  MISSED: "Perdida",
  CANCELLED: "Cancelada",
  // Line
  DRAFT: "Rascunho",
  READY: "Pronto p/ lote",
  IN_BATCH: "Em lote",
  INVOICED: "Faturado",
  PAID: "Pago",
  HELD: "Suspenso",
  GLOSSED: "Glosado",
  WRITTEN_OFF: "Baixado",
  // Batch
  SUBMITTED: "Enviado",
  PARTIALLY_PAID: "Parcial",
  DISPUTED: "Em disputa",
  // Study
  PLANNING: "Planejamento",
  ON_HOLD: "Em espera",
  CLOSED: "Encerrado",
};

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

export const KIND_LABELS: Record<string, string> = {
  VISIT: "Visita",
  SCREEN_FAIL: "Falha Triagem",
  PHONE: "Visita telefone",
  VIRTUAL: "Visita virtual",
  HOME: "Visita domiciliar",
  UNSCHEDULED: "Nao programada",
  START_UP: "Start-up",
  CLOSE_OUT: "Close-out",
  PASS_THROUGH: "Pass-through",
  CRF_TRIGGERED: "CRF (auto)",
  SUBSTUDY: "Subestudo",
  PHARMACY: "Farmacia",
  OTHER: "Outros",
};

export function kindLabel(kind: string) {
  return KIND_LABELS[kind] ?? kind;
}

export const METHOD_LABELS: Record<string, string> = {
  PER_OCCURRENCE: "Por ocorrencia",
  AMOUNT: "Valor fixo",
  QUANTITY: "Por quantidade",
  AS_INCURRED: "Conforme incorrido",
};

export function methodLabel(method: string) {
  return METHOD_LABELS[method] ?? method;
}
