import { prisma } from "@/lib/prisma";
import { priceAtFromHistory } from "@/lib/pricing";

const LOCKED_LINE_STATUSES = new Set(["IN_BATCH", "INVOICED", "PAID", "HELD", "GLOSSED", "WRITTEN_OFF"]);

export type CatalogProcedureInput = {
  budgetItemId: string;
  quantity?: number;
};

export type AdHocProcedureInput = {
  name: string;
  unitAmount: number;
  description?: string;
  quantity?: number;
};

export function isLineLocked(status: string): boolean {
  return LOCKED_LINE_STATUSES.has(status);
}

export function computeLineAmounts(
  unitAmount: number,
  quantity: number,
  holdbackPercent: number
): { gross: number; hold: number; net: number } {
  const gross = +(unitAmount * quantity).toFixed(2);
  const hold = +(gross * (holdbackPercent / 100)).toFixed(2);
  const net = +(gross - hold).toFixed(2);
  return { gross, hold, net };
}

/** Soma liquido das linhas de uma visita (para listagem). */
export function sumVisitNet(
  lines: Array<{ netAmount: number; status?: string }>,
  onlyCompleted = true
): number {
  return lines.reduce((s, l) => s + l.netAmount, 0);
}

export async function getOrCreateAdHocBudgetItem(
  contractVersionId: string,
  currency: string,
  effectiveDate: Date
) {
  const existing = await prisma.budgetItem.findFirst({
    where: { contractVersionId, code: "ADHOC-VISIT" },
  });
  if (existing) return existing;

  const created = await prisma.budgetItem.create({
    data: {
      contractVersionId,
      code: "ADHOC-VISIT",
      name: "Procedimento avulso (autorizado)",
      kind: "OTHER",
      method: "PER_OCCURRENCE",
      unitAmount: 0,
      defaultQuantity: 1,
      currency,
      boundToVisit: false,
      description: "Procedimentos nao previstos no catalogo, autorizados pelo patrocinador",
    },
  });

  await prisma.budgetItemPrice.create({
    data: {
      budgetItemId: created.id,
      effectiveFrom: effectiveDate,
      unitAmount: 0,
      reasonKind: "INITIAL",
      reason: "Item placeholder para procedimentos avulsos",
    },
  });

  return created;
}

export async function resolveUnitPrice(
  budgetItemId: string,
  occurredAt: Date
): Promise<number> {
  const item = await prisma.budgetItem.findUnique({
    where: { id: budgetItemId },
    include: { prices: { orderBy: { effectiveFrom: "desc" } } },
  });
  if (!item) return 0;
  return priceAtFromHistory(
    item.unitAmount,
    item.prices.map((p) => ({ effectiveFrom: p.effectiveFrom, unitAmount: p.unitAmount })),
    occurredAt
  );
}

/** Sincroniza BillableLines da visita com os procedimentos marcados como realizados. */
export async function syncVisitBillableLines(opts: {
  subjectVisitId: string;
  subjectId: string;
  studyId: string;
  occurredAt: Date;
  catalogPerformed: CatalogProcedureInput[];
  adHocPerformed: AdHocProcedureInput[];
  notes?: string | null;
}) {
  const contract = await prisma.contractVersion.findFirst({
    where: { studyId: opts.studyId, isActive: true },
  });
  if (!contract) throw new Error("Contrato ativo nao encontrado");

  const adHocItem = await getOrCreateAdHocBudgetItem(
    contract.id,
    contract.currency,
    contract.effectiveDate
  );

  const existing = await prisma.billableLine.findMany({
    where: { subjectVisitId: opts.subjectVisitId },
  });

  const locked = existing.filter((l) => isLineLocked(l.status));
  const editable = existing.filter((l) => !isLineLocked(l.status));

  // Remove linhas editaveis antigas (serao recriadas)
  if (editable.length > 0) {
    await prisma.billableLine.deleteMany({
      where: { id: { in: editable.map((l) => l.id) } },
    });
  }

  const visitNote = opts.notes?.trim() || null;

  for (const proc of opts.catalogPerformed) {
    const qty = proc.quantity ?? 1;
    const unit = await resolveUnitPrice(proc.budgetItemId, opts.occurredAt);
    const { gross, hold, net } = computeLineAmounts(unit, qty, contract.holdbackPercent);

    const item = await prisma.budgetItem.findUnique({ where: { id: proc.budgetItemId } });
    await prisma.billableLine.create({
      data: {
        budgetItemId: proc.budgetItemId,
        subjectId: opts.subjectId,
        subjectVisitId: opts.subjectVisitId,
        occurredAt: opts.occurredAt,
        quantity: qty,
        grossAmount: gross,
        holdbackAmount: hold,
        netAmount: net,
        currency: contract.currency,
        status: "READY",
        description: item?.name ?? null,
      },
    });
  }

  for (const proc of opts.adHocPerformed) {
    const qty = proc.quantity ?? 1;
    const unit = proc.unitAmount;
    const { gross, hold, net } = computeLineAmounts(unit, qty, contract.holdbackPercent);
    const desc = `[Avulso] ${proc.name}${proc.description ? ` — ${proc.description}` : ""}${
      visitNote ? ` | Obs. visita: ${visitNote}` : ""
    }`;

    await prisma.billableLine.create({
      data: {
        budgetItemId: adHocItem.id,
        subjectId: opts.subjectId,
        subjectVisitId: opts.subjectVisitId,
        occurredAt: opts.occurredAt,
        quantity: qty,
        grossAmount: gross,
        holdbackAmount: hold,
        netAmount: net,
        currency: contract.currency,
        status: "READY",
        description: desc,
      },
    });
  }

  return { lockedCount: locked.length, createdCount: opts.catalogPerformed.length + opts.adHocPerformed.length };
}
