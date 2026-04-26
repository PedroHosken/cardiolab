"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function markBatchPaid(batchId: string) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error("Lote nao encontrado");

  await prisma.$transaction(async (tx) => {
    await tx.billableLine.updateMany({
      where: { batchId },
      data: { status: "PAID" },
    });
    const updated = await tx.batch.update({
      where: { id: batchId },
      data: {
        status: "PAID",
        paidDate: new Date(),
        totalPaid: batch.totalNet,
      },
    });
    await tx.auditLog.create({
      data: {
        entity: "Batch",
        entityId: batchId,
        action: "BATCH_PAY",
        before: JSON.stringify({ status: batch.status }),
        after: JSON.stringify({ status: updated.status, paidDate: updated.paidDate }),
        notes: "Lote marcado como pago - propagacao automatica para todas as linhas",
      },
    });
  });

  revalidatePath("/lotes");
  revalidatePath(`/lotes/${batchId}`);
  revalidatePath("/lancamentos");
  revalidatePath("/");
}

export async function holdLine(lineId: string, reason: string) {
  const line = await prisma.billableLine.findUnique({ where: { id: lineId } });
  if (!line) throw new Error("Linha nao encontrada");

  await prisma.$transaction(async (tx) => {
    await tx.billableLine.update({
      where: { id: lineId },
      data: { status: "HELD", holdReason: reason },
    });
    await tx.auditLog.create({
      data: {
        entity: "BillableLine",
        entityId: lineId,
        action: "STATUS_CHANGE",
        before: JSON.stringify({ status: line.status }),
        after: JSON.stringify({ status: "HELD", holdReason: reason }),
      },
    });
  });

  revalidatePath("/lancamentos");
  revalidatePath("/lotes");
}

export async function generatePendingBatch(formData: FormData) {
  const studyId = formData.get("studyId") as string;
  const referenceMonth = (formData.get("referenceMonth") as string) || null;
  if (!studyId) throw new Error("Selecione uma pesquisa");

  // Reune linhas READY (e HELD se reaprovado para reentrar) que nao estao em batch
  const lines = await prisma.billableLine.findMany({
    where: {
      status: "READY",
      batchId: null,
      OR: [
        { subject: { studyId } },
        { AND: [{ subjectId: null }, { batchId: null }] }, // itens fixos sem subject
      ],
    },
  });

  if (lines.length === 0) {
    throw new Error("Nenhuma linha pronta para faturamento.");
  }

  // numero do lote
  const lastBatch = await prisma.batch.findFirst({
    where: { studyId },
    orderBy: { createdAt: "desc" },
  });
  const seq = lastBatch ? parseInt(lastBatch.batchNumber.split("-").pop() || "0", 10) + 1 : 1;
  const monthKey = referenceMonth ?? new Date().toISOString().slice(0, 7);
  const batchNumber = `${monthKey}-${String(seq).padStart(3, "0")}`;

  let newBatchId = "";
  await prisma.$transaction(async (tx) => {
    const totalGross = lines.reduce((s, l) => s + l.grossAmount, 0);
    const totalHold = lines.reduce((s, l) => s + l.holdbackAmount, 0);
    const totalNet = lines.reduce((s, l) => s + l.netAmount, 0);

    const batch = await tx.batch.create({
      data: {
        studyId,
        batchNumber,
        referenceMonth: monthKey,
        status: "DRAFT",
        currency: lines[0]?.currency ?? "USD",
        totalGross: +totalGross.toFixed(2),
        totalHoldback: +totalHold.toFixed(2),
        totalNet: +totalNet.toFixed(2),
      },
    });
    newBatchId = batch.id;

    await tx.billableLine.updateMany({
      where: { id: { in: lines.map((l) => l.id) } },
      data: { batchId: batch.id, status: "IN_BATCH" },
    });

    await tx.auditLog.create({
      data: {
        entity: "Batch",
        entityId: batch.id,
        action: "CREATE",
        notes: `Lote gerado com ${lines.length} linhas (pendentes)`,
      },
    });
  });

  revalidatePath("/lotes");
  revalidatePath("/lancamentos");
  redirect(`/lotes/${newBatchId}`);
}
