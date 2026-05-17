import { prisma } from "@/lib/prisma";

/**
 * Retorna o preco unitario vigente do BudgetItem na data informada.
 * Considera o historico em BudgetItemPrice (effectiveFrom <= occurredAt).
 * Se nao houver registro vigente, retorna o unitAmount base do item.
 */
export async function priceAt(budgetItemId: string, occurredAt: Date): Promise<number> {
  const last = await prisma.budgetItemPrice.findFirst({
    where: { budgetItemId, effectiveFrom: { lte: occurredAt } },
    orderBy: { effectiveFrom: "desc" },
  });
  if (last) return last.unitAmount;
  const item = await prisma.budgetItem.findUnique({ where: { id: budgetItemId } });
  return item?.unitAmount ?? 0;
}

/** Versao que recebe historico ja carregado (evita roundtrip). */
export function priceAtFromHistory(
  base: number,
  history: Array<{ effectiveFrom: Date; unitAmount: number }>,
  occurredAt: Date
): number {
  const sorted = [...history].sort((a, b) => +b.effectiveFrom - +a.effectiveFrom);
  for (const p of sorted) {
    if (p.effectiveFrom <= occurredAt) return p.unitAmount;
  }
  return base;
}
