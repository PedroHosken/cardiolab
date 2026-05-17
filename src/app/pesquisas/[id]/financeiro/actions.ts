"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function parseDate(value: string): Date {
  const v = value.trim();
  if (!v) throw new Error("Data invalida");
  return new Date(`${v}T12:00:00`);
}

// =============================================================================
// 1) Reajuste anual por indice (multiplica todos os itens do contrato ativo)
// =============================================================================
export async function applyAnnualAdjustment(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const indexLabel = String(formData.get("indexLabel") ?? "").trim();
  const percent = parseFloat(String(formData.get("percent") ?? ""));
  const effectiveFromRaw = String(formData.get("effectiveFrom") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!studyId) throw new Error("Pesquisa invalida");
  if (!indexLabel) throw new Error("Informe o indice (ex.: IPCA 2026)");
  if (!Number.isFinite(percent)) throw new Error("Percentual invalido");
  const effectiveFrom = parseDate(effectiveFromRaw);

  const contract = await prisma.contractVersion.findFirst({
    where: { studyId, isActive: true },
    include: { budgetItems: true },
  });
  if (!contract) throw new Error("Pesquisa sem contrato ativo");

  const multiplier = 1 + percent / 100;

  const adjustment = await prisma.contractAdjustment.create({
    data: {
      contractVersionId: contract.id,
      kind: "ANNUAL_INDEX",
      effectiveFrom,
      indexLabel,
      multiplier,
      notes,
    },
  });

  // Cria um novo BudgetItemPrice para cada item com o valor reajustado.
  // Nao alteramos o unitAmount base — billables passam a usar o historico via priceAt().
  for (const item of contract.budgetItems) {
    // Pega o ultimo preco vigente ate effectiveFrom (ou base do item)
    const last = await prisma.budgetItemPrice.findFirst({
      where: { budgetItemId: item.id, effectiveFrom: { lte: effectiveFrom } },
      orderBy: { effectiveFrom: "desc" },
    });
    const baseAmount = last?.unitAmount ?? item.unitAmount;
    const newAmount = +(baseAmount * multiplier).toFixed(2);
    if (newAmount === baseAmount) continue;
    await prisma.budgetItemPrice.create({
      data: {
        budgetItemId: item.id,
        effectiveFrom,
        unitAmount: newAmount,
        reason: `Reajuste ${indexLabel} (${percent.toFixed(2)}%)`,
        reasonKind: "ANNUAL_INDEX",
        adjustmentId: adjustment.id,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      entity: "ContractAdjustment",
      entityId: adjustment.id,
      action: "CREATE",
      after: JSON.stringify({ kind: "ANNUAL_INDEX", indexLabel, percent, effectiveFrom }),
      notes: `Reajuste ${indexLabel} ${percent.toFixed(2)}% a partir de ${effectiveFromRaw}`,
    },
  });

  revalidatePath(`/pesquisas/${studyId}/financeiro`);
  revalidatePath(`/pesquisas/${studyId}/orcamento`);
  redirect(`/pesquisas/${studyId}/financeiro/reajustes`);
}

// =============================================================================
// 2) Renegociacao - novo preco por item (apenas os marcados)
// =============================================================================
export async function applyRenegotiation(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const effectiveFromRaw = String(formData.get("effectiveFrom") ?? "");
  const indexLabel = String(formData.get("indexLabel") ?? "").trim() || "Renegociacao";
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!studyId) throw new Error("Pesquisa invalida");
  const effectiveFrom = parseDate(effectiveFromRaw);

  const contract = await prisma.contractVersion.findFirst({
    where: { studyId, isActive: true },
    include: { budgetItems: true },
  });
  if (!contract) throw new Error("Pesquisa sem contrato ativo");

  // Coleta entradas: para cada item, se houver `newPrice_<id>` preenchido, gera nova linha de preco
  const updates: Array<{ itemId: string; oldPrice: number; newPrice: number }> = [];
  for (const item of contract.budgetItems) {
    const raw = String(formData.get(`newPrice_${item.id}`) ?? "").trim();
    if (raw === "") continue;
    const newPrice = parseFloat(raw);
    if (!Number.isFinite(newPrice) || newPrice < 0) continue;
    const last = await prisma.budgetItemPrice.findFirst({
      where: { budgetItemId: item.id, effectiveFrom: { lte: effectiveFrom } },
      orderBy: { effectiveFrom: "desc" },
    });
    const oldPrice = last?.unitAmount ?? item.unitAmount;
    if (newPrice === oldPrice) continue;
    updates.push({ itemId: item.id, oldPrice, newPrice });
  }

  if (updates.length === 0) {
    throw new Error("Informe ao menos um novo valor para registrar a renegociacao.");
  }

  const adjustment = await prisma.contractAdjustment.create({
    data: {
      contractVersionId: contract.id,
      kind: "RENEGOTIATION",
      effectiveFrom,
      indexLabel,
      notes,
    },
  });

  for (const u of updates) {
    await prisma.budgetItemPrice.create({
      data: {
        budgetItemId: u.itemId,
        effectiveFrom,
        unitAmount: u.newPrice,
        reason: `Renegociacao: ${u.oldPrice.toFixed(2)} → ${u.newPrice.toFixed(2)}`,
        reasonKind: "RENEGOTIATION",
        adjustmentId: adjustment.id,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      entity: "ContractAdjustment",
      entityId: adjustment.id,
      action: "CREATE",
      after: JSON.stringify({ kind: "RENEGOTIATION", effectiveFrom, items: updates.length }),
      notes: `Renegociacao em ${effectiveFromRaw} - ${updates.length} itens reajustados`,
    },
  });

  revalidatePath(`/pesquisas/${studyId}/financeiro`);
  revalidatePath(`/pesquisas/${studyId}/orcamento`);
  redirect(`/pesquisas/${studyId}/financeiro/reajustes`);
}

// =============================================================================
// 3) Remover ajuste (apaga adjustment e historico vinculado)
// =============================================================================
export async function removeAdjustment(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const adjustmentId = String(formData.get("adjustmentId"));
  if (!studyId || !adjustmentId) throw new Error("Dados invalidos");

  await prisma.budgetItemPrice.deleteMany({ where: { adjustmentId } });
  await prisma.contractAdjustment.delete({ where: { id: adjustmentId } });

  await prisma.auditLog.create({
    data: {
      entity: "ContractAdjustment",
      entityId: adjustmentId,
      action: "DELETE",
      notes: "Reajuste removido",
    },
  });

  revalidatePath(`/pesquisas/${studyId}/financeiro/reajustes`);
}
