"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function markBatchPaid(formData: FormData) {
  const batchId = formData.get("batchId") as string;
  const studyId = formData.get("studyId") as string;
  if (!batchId) throw new Error("Lote invalido");

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

  revalidatePath(`/pesquisas/${studyId}/lotes`);
  revalidatePath(`/pesquisas/${studyId}/lotes/${batchId}`);
  revalidatePath(`/pesquisas/${studyId}/lancamentos`);
  revalidatePath("/");
}

export async function generatePendingBatch(formData: FormData) {
  const studyId = formData.get("studyId") as string;
  const referenceMonth = (formData.get("referenceMonth") as string) || null;
  if (!studyId) throw new Error("Pesquisa invalida");

  const lines = await prisma.billableLine.findMany({
    where: {
      status: "READY",
      batchId: null,
      OR: [
        { subject: { studyId } },
        { AND: [{ subjectId: null }, { batchId: null }] },
      ],
    },
  });

  if (lines.length === 0) {
    throw new Error("Nenhuma linha pronta para faturamento.");
  }

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

  revalidatePath(`/pesquisas/${studyId}/lotes`);
  revalidatePath(`/pesquisas/${studyId}/lancamentos`);
  redirect(`/pesquisas/${studyId}/lotes/${newBatchId}`);
}
