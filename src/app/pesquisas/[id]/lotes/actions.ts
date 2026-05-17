"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseBillingMode, type BillingMode } from "@/lib/billing-mode";
import { recalculateBatchTotals, sumBatchLines } from "@/lib/batch-totals";

function studyPaths(studyId: string) {
  return [
    `/pesquisas/${studyId}/lotes`,
    `/pesquisas/${studyId}/lancamentos`,
    `/pesquisas/${studyId}/financeiro`,
    `/pesquisas/${studyId}`,
    "/",
  ];
}

function revalidateStudy(studyId: string, batchId?: string) {
  for (const p of studyPaths(studyId)) revalidatePath(p);
  if (batchId) revalidatePath(`/pesquisas/${studyId}/lotes/${batchId}`);
}

async function nextBatchNumber(studyId: string, referenceMonth: string) {
  const lastBatch = await prisma.batch.findFirst({
    where: { studyId },
    orderBy: { createdAt: "desc" },
  });
  const seq = lastBatch ? parseInt(lastBatch.batchNumber.split("-").pop() || "0", 10) + 1 : 1;
  return `${referenceMonth}-${String(seq).padStart(3, "0")}`;
}

async function audit(entity: string, entityId: string, action: string, notes: string, after?: object) {
  await prisma.auditLog.create({
    data: {
      entity,
      entityId,
      action,
      notes,
      after: after ? JSON.stringify(after) : undefined,
    },
  });
}

/** Cria lote em rascunho com linhas selecionadas (READY, mesmo billingMode). */
export async function createBatchFromLines(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const billingMode = parseBillingMode(String(formData.get("billingMode")));
  const referenceMonth =
    String(formData.get("referenceMonth") ?? "").trim() ||
    new Date().toISOString().slice(0, 7);
  const lineIds = formData.getAll("lineIds").map(String).filter(Boolean);

  if (!studyId) throw new Error("Pesquisa invalida");
  if (lineIds.length === 0) throw new Error("Selecione ao menos um lancamento");

  const lines = await prisma.billableLine.findMany({
    where: {
      id: { in: lineIds },
      status: "READY",
      batchId: null,
      budgetItem: { billingMode },
      OR: [{ subject: { studyId } }, { subjectId: null }],
    },
    include: { budgetItem: true },
  });

  if (lines.length === 0) {
    throw new Error("Nenhuma linha valida para o lote (verifique status e modalidade)");
  }

  const batchNumber = await nextBatchNumber(studyId, referenceMonth);
  const totals = sumBatchLines(lines);

  const batch = await prisma.batch.create({
    data: {
      studyId,
      batchNumber,
      referenceMonth,
      billingMode,
      status: "DRAFT",
      currency: lines[0]?.currency ?? "USD",
      ...totals,
    },
  });

  await prisma.billableLine.updateMany({
    where: { id: { in: lines.map((l) => l.id) } },
    data: { batchId: batch.id, status: "IN_BATCH" },
  });

  await audit("Batch", batch.id, "CREATE", `Lote ${billingMode} com ${lines.length} linhas`, {
    batchNumber,
    billingMode,
    lineCount: lines.length,
  });

  revalidateStudy(studyId, batch.id);
  redirect(`/pesquisas/${studyId}/lotes/${batch.id}`);
}

/** Proforma enviado / faturado — aguardando pagamento do patrocinador. */
export async function submitBatch(formData: FormData) {
  const batchId = String(formData.get("batchId"));
  const studyId = String(formData.get("studyId"));
  const proformaNotes = String(formData.get("proformaNotes") ?? "").trim() || null;

  const batch = await prisma.batch.findFirst({ where: { id: batchId, studyId } });
  if (!batch) throw new Error("Lote nao encontrado");
  if (batch.status !== "DRAFT") throw new Error("Somente lotes em rascunho podem ser enviados");

  const lines = await prisma.billableLine.findMany({
    where: { batchId, status: "IN_BATCH" },
  });
  if (lines.length === 0) throw new Error("Lote sem linhas ativas");

  await prisma.$transaction(async (tx) => {
    await tx.billableLine.updateMany({
      where: { batchId, status: "IN_BATCH" },
      data: { status: "INVOICED", statusChangedAt: new Date() },
    });
    await tx.batch.update({
      where: { id: batchId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        proformaNotes,
      },
    });
  });

  await audit("Batch", batchId, "SUBMIT", "Lote enviado — em processo de pagamento", {
    lineCount: lines.length,
  });

  revalidateStudy(studyId, batchId);
}

export async function markBatchPaid(formData: FormData) {
  const batchId = formData.get("batchId") as string;
  const studyId = formData.get("studyId") as string;
  if (!batchId) throw new Error("Lote invalido");

  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error("Lote nao encontrado");
  if (!["SUBMITTED", "PARTIALLY_PAID", "DISPUTED"].includes(batch.status)) {
    throw new Error("Somente lotes enviados podem ser marcados como pagos");
  }

  await prisma.$transaction(async (tx) => {
    await tx.billableLine.updateMany({
      where: { batchId, status: { in: ["INVOICED", "IN_BATCH"] } },
      data: { status: "PAID", statusChangedAt: new Date() },
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
        notes: "Lote marcado como pago",
      },
    });
  });

  revalidateStudy(studyId, batchId);
}

/** Glosa: patrocinador nao pagara / inconsistencia. */
export async function glosseLine(formData: FormData) {
  const lineId = String(formData.get("lineId"));
  const studyId = String(formData.get("studyId"));
  const batchId = String(formData.get("batchId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("Informe o motivo da glosa");

  const line = await prisma.billableLine.findFirst({
    where: { id: lineId },
    include: { batch: true },
  });
  if (!line) throw new Error("Lancamento nao encontrado");
  if (line.status === "PAID") throw new Error("Linha ja paga nao pode ser glosada");

  await prisma.billableLine.update({
    where: { id: lineId },
    data: {
      status: "GLOSSED",
      statusReason: reason,
      statusChangedAt: new Date(),
      batchId: null,
    },
  });

  if (line.batchId) await recalculateBatchTotals(line.batchId);

  await audit("BillableLine", lineId, "GLOSSE", reason, { batchId: line.batchId });

  revalidateStudy(studyId, batchId || line.batchId || undefined);
}

/** Suspende linha (pendencia documental / query). */
export async function holdLine(formData: FormData) {
  const lineId = String(formData.get("lineId"));
  const studyId = String(formData.get("studyId"));
  const batchId = String(formData.get("batchId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("Informe o motivo da suspensao");

  const line = await prisma.billableLine.findUnique({ where: { id: lineId } });
  if (!line) throw new Error("Lancamento nao encontrado");
  if (line.status === "PAID") throw new Error("Linha ja paga");

  await prisma.billableLine.update({
    where: { id: lineId },
    data: {
      status: "HELD",
      holdReason: reason,
      statusReason: reason,
      statusChangedAt: new Date(),
      batchId: null,
    },
  });

  if (line.batchId) await recalculateBatchTotals(line.batchId);

  await audit("BillableLine", lineId, "HOLD", reason);

  revalidateStudy(studyId, batchId || line.batchId || undefined);
}

/** Retorna linha glosada/suspensa para fila de cobranca. */
export async function releaseLineToReady(formData: FormData) {
  const lineId = String(formData.get("lineId"));
  const studyId = String(formData.get("studyId"));

  const line = await prisma.billableLine.findUnique({ where: { id: lineId } });
  if (!line) throw new Error("Lancamento nao encontrado");
  if (!["HELD", "GLOSSED"].includes(line.status)) {
    throw new Error("Somente linhas suspensas ou glosadas podem voltar a pendente");
  }

  await prisma.billableLine.update({
    where: { id: lineId },
    data: {
      status: "READY",
      holdReason: null,
      statusReason: null,
      statusChangedAt: new Date(),
      batchId: null,
    },
  });

  await audit("BillableLine", lineId, "RELEASE", "Linha liberada para novo lote");

  revalidateStudy(studyId);
}

/** Remove linha do lote em rascunho. */
export async function removeLineFromDraftBatch(formData: FormData) {
  const lineId = String(formData.get("lineId"));
  const studyId = String(formData.get("studyId"));
  const batchId = String(formData.get("batchId"));

  const batch = await prisma.batch.findFirst({ where: { id: batchId, studyId } });
  if (!batch || batch.status !== "DRAFT") {
    throw new Error("Somente lotes em rascunho permitem remover linhas");
  }

  await prisma.billableLine.update({
    where: { id: lineId, batchId },
    data: { status: "READY", batchId: null },
  });

  await recalculateBatchTotals(batchId);
  revalidateStudy(studyId, batchId);
}

/** Legado: gera lote com todas READY (mantido para compat). */
export async function generatePendingBatch(formData: FormData) {
  const studyId = formData.get("studyId") as string;
  const billingMode = parseBillingMode(
    String(formData.get("billingMode") ?? "SPONSOR_EDC")
  );
  const referenceMonth =
    (formData.get("referenceMonth") as string) || new Date().toISOString().slice(0, 7);

  const lines = await prisma.billableLine.findMany({
    where: {
      status: "READY",
      batchId: null,
      budgetItem: { billingMode },
      OR: [{ subject: { studyId } }, { subjectId: null }],
    },
    select: { id: true },
  });

  if (lines.length === 0) throw new Error("Nenhuma linha pronta para faturamento.");

  const fd = new FormData();
  fd.set("studyId", studyId);
  fd.set("billingMode", billingMode);
  fd.set("referenceMonth", referenceMonth);
  for (const l of lines) fd.append("lineIds", l.id);
  return createBatchFromLines(fd);
}
