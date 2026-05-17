import { prisma } from "@/lib/prisma";

export function sumBatchLines(
  lines: Array<{ grossAmount: number; holdbackAmount: number; netAmount: number }>
) {
  const totalGross = lines.reduce((s, l) => s + l.grossAmount, 0);
  const totalHold = lines.reduce((s, l) => s + l.holdbackAmount, 0);
  const totalNet = lines.reduce((s, l) => s + l.netAmount, 0);
  return {
    totalGross: +totalGross.toFixed(2),
    totalHoldback: +totalHold.toFixed(2),
    totalNet: +totalNet.toFixed(2),
  };
}

export async function recalculateBatchTotals(batchId: string) {
  const lines = await prisma.billableLine.findMany({
    where: { batchId, status: { notIn: ["GLOSSED", "WRITTEN_OFF"] } },
  });
  const totals = sumBatchLines(lines);
  await prisma.batch.update({
    where: { id: batchId },
    data: totals,
  });
  return totals;
}
