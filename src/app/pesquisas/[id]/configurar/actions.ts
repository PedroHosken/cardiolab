"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function adv(study: { id: string; wizardStep: number }, target: number) {
  return Math.max(study.wizardStep, target);
}

// =============================================================================
// PASSO 1 - cria/atualiza pesquisa basica
// =============================================================================
export async function createDraftStudy(formData: FormData) {
  const protocolNumber = String(formData.get("protocolNumber") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const shortTitle = String(formData.get("shortTitle") ?? "").trim() || null;
  const phase = String(formData.get("phase") ?? "").trim() || null;
  const therapeuticArea = String(formData.get("therapeuticArea") ?? "").trim() || null;
  const defaultCurrency = String(formData.get("defaultCurrency") ?? "USD").trim() || "USD";

  if (!protocolNumber) throw new Error("Numero de protocolo e obrigatorio");
  if (!title) throw new Error("Titulo e obrigatorio");

  const exists = await prisma.study.findUnique({ where: { protocolNumber } });
  if (exists) throw new Error("Ja existe pesquisa com este numero de protocolo");

  const study = await prisma.study.create({
    data: {
      protocolNumber,
      title,
      shortTitle,
      phase,
      therapeuticArea,
      defaultCurrency,
      status: "PLANNING",
      wizardStep: 2,
    },
  });

  await prisma.auditLog.create({
    data: { entity: "Study", entityId: study.id, action: "CREATE", notes: "Wizard P1" },
  });

  redirect(`/pesquisas/${study.id}/configurar/patrocinador`);
}

export async function updateBasics(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const protocolNumber = String(formData.get("protocolNumber") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const shortTitle = String(formData.get("shortTitle") ?? "").trim() || null;
  const phase = String(formData.get("phase") ?? "").trim() || null;
  const therapeuticArea = String(formData.get("therapeuticArea") ?? "").trim() || null;
  const defaultCurrency = String(formData.get("defaultCurrency") ?? "USD").trim() || "USD";
  if (!studyId) throw new Error("Pesquisa invalida");

  const study = await prisma.study.findUnique({ where: { id: studyId } });
  if (!study) throw new Error("Pesquisa nao encontrada");

  await prisma.study.update({
    where: { id: studyId },
    data: {
      protocolNumber,
      title,
      shortTitle,
      phase,
      therapeuticArea,
      defaultCurrency,
      wizardStep: adv(study, 2),
    },
  });

  redirect(`/pesquisas/${studyId}/configurar/patrocinador`);
}

// =============================================================================
// PASSO 2 - patrocinador / CRO
// =============================================================================
export async function setSponsorCro(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const sponsorMode = String(formData.get("sponsorMode") ?? "existing");
  const sponsorId = String(formData.get("sponsorId") ?? "") || null;
  const sponsorName = String(formData.get("sponsorName") ?? "").trim();
  const sponsorCountry = String(formData.get("sponsorCountry") ?? "").trim() || null;

  const croMode = String(formData.get("croMode") ?? "none");
  const croId = String(formData.get("croId") ?? "") || null;
  const croName = String(formData.get("croName") ?? "").trim();
  const croCountry = String(formData.get("croCountry") ?? "").trim() || null;

  if (!studyId) throw new Error("Pesquisa invalida");
  const study = await prisma.study.findUnique({ where: { id: studyId } });
  if (!study) throw new Error("Pesquisa nao encontrada");

  let finalSponsorId = sponsorId;
  if (sponsorMode === "new") {
    if (!sponsorName) throw new Error("Nome do patrocinador e obrigatorio");
    const created = await prisma.sponsor.create({
      data: { name: sponsorName, country: sponsorCountry },
    });
    finalSponsorId = created.id;
  }
  if (!finalSponsorId) throw new Error("Selecione ou cadastre um patrocinador");

  let finalCroId: string | null = null;
  if (croMode === "existing" && croId) finalCroId = croId;
  else if (croMode === "new") {
    if (!croName) throw new Error("Nome da CRO e obrigatorio");
    const created = await prisma.cro.create({ data: { name: croName, country: croCountry } });
    finalCroId = created.id;
  }

  await prisma.study.update({
    where: { id: studyId },
    data: {
      sponsorId: finalSponsorId,
      croId: finalCroId,
      wizardStep: adv(study, 3),
    },
  });

  redirect(`/pesquisas/${studyId}/configurar/contrato`);
}

// =============================================================================
// PASSO 3 - contrato vigente (cria/atualiza ContractVersion ativa)
// =============================================================================
export async function setContract(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const versionLabel = String(formData.get("versionLabel") ?? "").trim() || "v1";
  const effectiveDate = String(formData.get("effectiveDate") ?? "");
  const currency = String(formData.get("currency") ?? "USD") || "USD";
  const overheadPercent = parseFloat(String(formData.get("overheadPercent") ?? "0")) || 0;
  const holdbackPercent = parseFloat(String(formData.get("holdbackPercent") ?? "0")) || 0;
  const paymentTerms = String(formData.get("paymentTerms") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!studyId) throw new Error("Pesquisa invalida");
  if (!effectiveDate) throw new Error("Data de vigencia e obrigatoria");

  const study = await prisma.study.findUnique({ where: { id: studyId } });
  if (!study) throw new Error("Pesquisa nao encontrada");

  const existing = await prisma.contractVersion.findFirst({
    where: { studyId, isActive: true },
  });

  if (existing) {
    await prisma.contractVersion.update({
      where: { id: existing.id },
      data: { versionLabel, effectiveDate: new Date(effectiveDate), currency, overheadPercent, holdbackPercent, paymentTerms, notes },
    });
  } else {
    await prisma.contractVersion.create({
      data: {
        studyId,
        versionLabel,
        effectiveDate: new Date(effectiveDate),
        currency,
        overheadPercent,
        holdbackPercent,
        paymentTerms,
        notes,
        isActive: true,
      },
    });
  }

  await prisma.study.update({
    where: { id: studyId },
    data: { wizardStep: adv(study, 4) },
  });

  redirect(`/pesquisas/${studyId}/configurar/cronograma`);
}

// =============================================================================
// PASSO 4 - cronograma de visitas
// =============================================================================
export async function addVisitTemplate(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const weekOffset = parseInt(String(formData.get("weekOffset") ?? "0"), 10);
  const visitType = String(formData.get("visitType") ?? "in_person");
  const windowMinusDays = parseInt(String(formData.get("windowMinusDays") ?? "0"), 10) || null;
  const windowPlusDays = parseInt(String(formData.get("windowPlusDays") ?? "0"), 10) || null;

  if (!studyId) throw new Error("Pesquisa invalida");
  if (!code || !name) throw new Error("Codigo e nome da visita sao obrigatorios");

  const last = await prisma.visitTemplate.findFirst({
    where: { studyId },
    orderBy: { orderIndex: "desc" },
  });
  const orderIndex = (last?.orderIndex ?? -1) + 1;

  await prisma.visitTemplate.create({
    data: {
      studyId,
      code,
      name,
      weekOffset: Number.isFinite(weekOffset) ? weekOffset : null,
      isPhone: visitType === "phone",
      isVirtual: visitType === "virtual",
      isHome: visitType === "home",
      windowMinusDays,
      windowPlusDays,
      orderIndex,
    },
  });

  revalidatePath(`/pesquisas/${studyId}/configurar/cronograma`);
}

export async function removeVisitTemplate(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const visitId = String(formData.get("visitId"));
  if (!studyId || !visitId) throw new Error("Dados invalidos");

  await prisma.visitTemplate.delete({ where: { id: visitId } });
  revalidatePath(`/pesquisas/${studyId}/configurar/cronograma`);
}

export async function finishVisitsStep(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  if (!studyId) throw new Error("Pesquisa invalida");
  const study = await prisma.study.findUnique({ where: { id: studyId } });
  if (!study) throw new Error("Pesquisa nao encontrada");
  await prisma.study.update({
    where: { id: studyId },
    data: { wizardStep: adv(study, 5) },
  });
  redirect(`/pesquisas/${studyId}/configurar/catalogo`);
}

// =============================================================================
// PASSO 5 - catalogo de itens
// =============================================================================
export async function addBudgetItem(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const kind = String(formData.get("kind") ?? "VISIT");
  const method = String(formData.get("method") ?? "PER_OCCURRENCE");
  const unitAmount = parseFloat(String(formData.get("unitAmount") ?? "0")) || 0;
  const defaultQuantity = parseFloat(String(formData.get("defaultQuantity") ?? "1")) || 1;
  const requiresInvoice = formData.get("requiresInvoice") === "on";
  const autoTrigger = formData.get("autoTrigger") === "on";
  const appliesToAllVisits = formData.get("appliesToAllVisits") === "on";
  const visitTemplateIds = formData.getAll("visitTemplateIds").map(String).filter(Boolean);

  if (!studyId) throw new Error("Pesquisa invalida");
  if (!name) throw new Error("Nome do item e obrigatorio");

  const contract = await prisma.contractVersion.findFirst({
    where: { studyId, isActive: true },
  });
  if (!contract) throw new Error("Cadastre o contrato no Passo 3 antes");

  // Resolve a lista efetiva de visitas
  let effectiveVisitIds: string[] = [];
  if (appliesToAllVisits) {
    const all = await prisma.visitTemplate.findMany({
      where: { studyId },
      select: { id: true },
    });
    effectiveVisitIds = all.map((v) => v.id);
  } else {
    effectiveVisitIds = visitTemplateIds;
  }

  await prisma.budgetItem.create({
    data: {
      contractVersionId: contract.id,
      name,
      description,
      kind,
      method,
      unitAmount,
      defaultQuantity,
      currency: contract.currency,
      // visitTemplateId fica como atalho da primeira visita (compat)
      visitTemplateId: effectiveVisitIds[0] ?? null,
      appliesToAllVisits,
      autoTrigger,
      requiresInvoice,
      visits: {
        create: effectiveVisitIds.map((id) => ({ visitTemplateId: id })),
      },
    },
  });

  revalidatePath(`/pesquisas/${studyId}/configurar/catalogo`);
}

export async function autoFillVisitItems(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const baseAmount = parseFloat(String(formData.get("baseAmount") ?? "1500")) || 0;
  if (!studyId) throw new Error("Pesquisa invalida");

  const contract = await prisma.contractVersion.findFirst({
    where: { studyId, isActive: true },
  });
  if (!contract) throw new Error("Cadastre o contrato no Passo 3 antes");

  const visits = await prisma.visitTemplate.findMany({
    where: { studyId },
    orderBy: { orderIndex: "asc" },
  });

  const existingByVisit = new Set(
    (
      await prisma.budgetItem.findMany({
        where: { contractVersionId: contract.id, kind: "VISIT" },
        select: { visitTemplateId: true },
      })
    )
      .map((b) => b.visitTemplateId)
      .filter((x): x is string => !!x)
  );

  for (const v of visits) {
    if (existingByVisit.has(v.id)) continue;
    await prisma.budgetItem.create({
      data: {
        contractVersionId: contract.id,
        name: `Visita ${v.code} - ${v.name}`,
        kind: v.isPhone ? "PHONE" : v.isVirtual ? "VIRTUAL" : v.isHome ? "HOME" : "VISIT",
        method: "PER_OCCURRENCE",
        unitAmount: baseAmount,
        defaultQuantity: 1,
        currency: contract.currency,
        visitTemplateId: v.id,
        autoTrigger: true,
      },
    });
  }

  revalidatePath(`/pesquisas/${studyId}/configurar/catalogo`);
}

export async function removeBudgetItem(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const itemId = String(formData.get("itemId"));
  if (!studyId || !itemId) throw new Error("Dados invalidos");

  await prisma.budgetItem.delete({ where: { id: itemId } });
  revalidatePath(`/pesquisas/${studyId}/configurar/catalogo`);
}

export async function finishCatalogStep(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  if (!studyId) throw new Error("Pesquisa invalida");
  const study = await prisma.study.findUnique({ where: { id: studyId } });
  if (!study) throw new Error("Pesquisa nao encontrada");
  await prisma.study.update({
    where: { id: studyId },
    data: { wizardStep: adv(study, 6) },
  });
  redirect(`/pesquisas/${studyId}/configurar/revisao`);
}

// =============================================================================
// PASSO 6 - revisao + ativacao
// =============================================================================
export async function activateStudy(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  if (!studyId) throw new Error("Pesquisa invalida");

  const study = await prisma.study.findUnique({
    where: { id: studyId },
    include: {
      contractVersions: { where: { isActive: true } },
      visitTemplates: true,
    },
  });
  if (!study) throw new Error("Pesquisa nao encontrada");
  if (!study.sponsorId) throw new Error("Patrocinador obrigatorio (Passo 2)");
  if (study.contractVersions.length === 0) throw new Error("Contrato obrigatorio (Passo 3)");

  await prisma.study.update({
    where: { id: studyId },
    data: { status: "ACTIVE", wizardCompleted: true, wizardStep: 6 },
  });

  await prisma.auditLog.create({
    data: {
      entity: "Study",
      entityId: studyId,
      action: "STATUS_CHANGE",
      before: JSON.stringify({ status: study.status }),
      after: JSON.stringify({ status: "ACTIVE" }),
      notes: "Pesquisa ativada via wizard",
    },
  });

  revalidatePath("/pesquisas");
  revalidatePath(`/pesquisas/${studyId}`);
  redirect(`/pesquisas/${studyId}`);
}
