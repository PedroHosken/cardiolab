"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clampSubjectCodePadLength } from "@/lib/subject-code";

/** Input HTML type="date" (AAAA-MM-DD) -> Date ao meio-dia local para evitar deslocamento UTC. */
function parseHtmlDate(raw: unknown, label: string): Date {
  const s = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error(`${label}: informe uma data valida`);
  }
  const d = new Date(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`${label}: data invalida`);
  }
  return d;
}

function adv(study: { id: string; wizardStep: number }, target: number) {
  return Math.max(study.wizardStep, target);
}

// =============================================================================
// PASSO 1 - cria/atualiza pesquisa basica
// =============================================================================
function parseSubjectCodeSettings(formData: FormData, protocolNumber: string) {
  let subjectCodePrefix = String(formData.get("subjectCodePrefix") ?? "").trim();
  if (!subjectCodePrefix) subjectCodePrefix = `${protocolNumber}-`;

  const padRaw = Number.parseInt(String(formData.get("subjectCodePadLength") ?? "3"), 10);
  const subjectCodePadLength = clampSubjectCodePadLength(Number.isFinite(padRaw) ? padRaw : 3);

  const nextRaw = Number.parseInt(String(formData.get("subjectCodeNextNumber") ?? "1"), 10);
  const subjectCodeNextNumber = Math.max(1, Number.isFinite(nextRaw) ? nextRaw : 1);

  return { subjectCodePrefix, subjectCodePadLength, subjectCodeNextNumber };
}

export async function createDraftStudy(formData: FormData) {
  const protocolNumber = String(formData.get("protocolNumber") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const shortTitle = String(formData.get("shortTitle") ?? "").trim() || null;
  const phase = String(formData.get("phase") ?? "").trim() || null;
  const therapeuticArea = String(formData.get("therapeuticArea") ?? "").trim() || null;
  const defaultCurrency = String(formData.get("defaultCurrency") ?? "USD").trim() || "USD";

  if (!protocolNumber) throw new Error("Numero de protocolo e obrigatorio");
  if (!title) throw new Error("Titulo e obrigatorio");

  const { subjectCodePrefix, subjectCodePadLength, subjectCodeNextNumber } = parseSubjectCodeSettings(
    formData,
    protocolNumber
  );

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
      subjectCodePrefix,
      subjectCodePadLength,
      subjectCodeNextNumber,
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
  if (!protocolNumber) throw new Error("Numero de protocolo e obrigatorio");

  const { subjectCodePrefix, subjectCodePadLength, subjectCodeNextNumber } = parseSubjectCodeSettings(
    formData,
    protocolNumber
  );

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
      subjectCodePrefix,
      subjectCodePadLength,
      subjectCodeNextNumber,
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
  const studyId = String(formData.get("studyId") ?? "").trim();
  const versionLabel = String(formData.get("versionLabel") ?? "").trim() || "v1";
  const currency = String(formData.get("currency") ?? "USD").trim() || "USD";
  const overheadPercent = parseFloat(String(formData.get("overheadPercent") ?? "0")) || 0;
  const holdbackPercent = parseFloat(String(formData.get("holdbackPercent") ?? "0")) || 0;
  const paymentTerms = String(formData.get("paymentTerms") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const paymentFrequency =
    String(formData.get("paymentFrequency") ?? "").trim() || "QUARTERLY";

  if (!studyId) throw new Error("Pesquisa invalida");

  let effectiveDate: Date;
  let paymentStartDate: Date;
  try {
    effectiveDate = parseHtmlDate(formData.get("effectiveDate"), "Data de vigencia");
    paymentStartDate = parseHtmlDate(
      formData.get("paymentStartDate"),
      "Data de inicio do ciclo de pagamento"
    );
  } catch (e) {
    throw e instanceof Error ? e : new Error("Datas do contrato invalidas");
  }

  const study = await prisma.study.findUnique({ where: { id: studyId } });
  if (!study) throw new Error("Pesquisa nao encontrada");

  const existing = await prisma.contractVersion.findFirst({
    where: { studyId, isActive: true },
  });

  const payload = {
    versionLabel,
    effectiveDate,
    currency,
    overheadPercent,
    holdbackPercent,
    paymentTerms,
    notes,
    paymentFrequency,
    paymentStartDate,
    isActive: true as const,
  };

  try {
    if (existing) {
      await prisma.contractVersion.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      await prisma.contractVersion.create({
        data: { studyId, ...payload },
      });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      console.error("[setContract] PrismaClientValidationError", e.message);
      throw new Error(
        "Erro ao salvar o contrato no banco. " +
          "Se a mensagem original citar campo desconhecido (Unknown argument), rode na pasta do projeto: " +
          "`npx prisma db push` e `npx prisma generate`, depois reinicie o servidor. " +
          `Detalhe: ${e.message}`
      );
    }
    throw e;
  }

  await prisma.study.update({
    where: { id: studyId },
    data: { wizardStep: adv(study, 4) },
  });

  redirect(`/pesquisas/${studyId}/configurar/catalogo`);
}

// =============================================================================
// PASSO 5 - cronograma de visitas (depois do catalogo)
// =============================================================================
const VALID_VISIT_KINDS = new Set(["SCREENING", "RANDOMIZATION", "FOLLOWUP"]);

function parseIntOrNull(raw: unknown): number | null {
  const s = String(raw ?? "").trim();
  if (s === "") return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

export async function addVisitTemplate(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const visitKindRaw = String(formData.get("visitKind") ?? "FOLLOWUP");
  const visitKind = VALID_VISIT_KINDS.has(visitKindRaw) ? visitKindRaw : "FOLLOWUP";
  const dayOffset =
    visitKind === "RANDOMIZATION" ? 0 : parseIntOrNull(formData.get("dayOffset"));
  const visitType = String(formData.get("visitType") ?? "in_person");
  const windowDays = parseIntOrNull(formData.get("windowDays"));

  const optionalCheckbox1 = String(formData.get("optionalCheckbox1") ?? "").trim();
  const optionalCheckbox2 = String(formData.get("optionalCheckbox2") ?? "").trim();
  const optionalCheckbox3 = String(formData.get("optionalCheckbox3") ?? "").trim();
  const optionalText1Label = String(formData.get("optionalText1Label") ?? "").trim();
  const optionalNumber1Label = String(formData.get("optionalNumber1Label") ?? "").trim();

  if (!studyId) throw new Error("Pesquisa invalida");
  if (!code || !name) throw new Error("Codigo de visita e nome sao obrigatorios");
  if (visitKind === "SCREENING" && (dayOffset == null || dayOffset >= 0)) {
    throw new Error("Visita de Triagem precisa ter tempo NEGATIVO (dias antes da randomizacao).");
  }
  if (visitKind === "FOLLOWUP" && dayOffset != null && dayOffset < 0) {
    throw new Error("Visita de seguimento usa dias positivos (apos a randomizacao).");
  }
  if (visitKind === "RANDOMIZATION") {
    const dup = await prisma.visitTemplate.findFirst({
      where: { studyId, visitKind: "RANDOMIZATION" },
    });
    if (dup) throw new Error("Ja existe uma visita de Randomizacao no protocolo.");
  }

  const last = await prisma.visitTemplate.findFirst({
    where: { studyId },
    orderBy: { orderIndex: "desc" },
  });
  const orderIndex = (last?.orderIndex ?? -1) + 1;

  const optionalFieldDefs: Array<{ key: string; label: string; type: string }> = [];
  if (optionalCheckbox1) optionalFieldDefs.push({ key: "chk_1", label: optionalCheckbox1, type: "checkbox" });
  if (optionalCheckbox2) optionalFieldDefs.push({ key: "chk_2", label: optionalCheckbox2, type: "checkbox" });
  if (optionalCheckbox3) optionalFieldDefs.push({ key: "chk_3", label: optionalCheckbox3, type: "checkbox" });
  if (optionalText1Label) optionalFieldDefs.push({ key: "txt_1", label: optionalText1Label, type: "text" });
  if (optionalNumber1Label) optionalFieldDefs.push({ key: "num_1", label: optionalNumber1Label, type: "number" });

  await prisma.visitTemplate.create({
    data: {
      studyId,
      code,
      name,
      visitKind,
      dayOffset,
      isPhone: visitType === "phone",
      isVirtual: visitType === "virtual",
      isHome: visitType === "home",
      windowDays,
      orderIndex,
      optionalFieldDefs: JSON.stringify(optionalFieldDefs),
    },
  });

  revalidatePath(`/pesquisas/${studyId}/configurar/cronograma`);
}

// Atualiza visita existente + lista de itens faturaveis vinculados.
export async function updateVisitTemplate(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const visitId = String(formData.get("visitId"));
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const visitKindRaw = String(formData.get("visitKind") ?? "FOLLOWUP");
  const visitKind = VALID_VISIT_KINDS.has(visitKindRaw) ? visitKindRaw : "FOLLOWUP";
  const dayOffset =
    visitKind === "RANDOMIZATION" ? 0 : parseIntOrNull(formData.get("dayOffset"));
  const visitType = String(formData.get("visitType") ?? "in_person");
  const windowDays = parseIntOrNull(formData.get("windowDays"));
  const itemIds = formData.getAll("budgetItemIds").map(String).filter(Boolean);

  if (!studyId || !visitId) throw new Error("Dados invalidos");
  if (!code || !name) throw new Error("Codigo e nome sao obrigatorios");

  const visit = await prisma.visitTemplate.findFirst({ where: { id: visitId, studyId } });
  if (!visit) throw new Error("Visita nao encontrada");

  if (visitKind === "RANDOMIZATION") {
    const dup = await prisma.visitTemplate.findFirst({
      where: { studyId, visitKind: "RANDOMIZATION", id: { not: visitId } },
    });
    if (dup) throw new Error("Ja existe outra visita de Randomizacao no protocolo.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.visitTemplate.update({
      where: { id: visitId },
      data: {
        code,
        name,
        visitKind,
        dayOffset,
        isPhone: visitType === "phone",
        isVirtual: visitType === "virtual",
        isHome: visitType === "home",
        windowDays,
      },
    });

    // Sincroniza relacao com BudgetItem via tabela join BudgetItemVisit
    const existing = await tx.budgetItemVisit.findMany({
      where: { visitTemplateId: visitId },
      select: { budgetItemId: true },
    });
    const existingIds = new Set(existing.map((e) => e.budgetItemId));
    const next = new Set(itemIds);

    const toAdd = itemIds.filter((id) => !existingIds.has(id));
    const toRemove = existing.map((e) => e.budgetItemId).filter((id) => !next.has(id));

    if (toRemove.length > 0) {
      await tx.budgetItemVisit.deleteMany({
        where: { visitTemplateId: visitId, budgetItemId: { in: toRemove } },
      });
    }
    if (toAdd.length > 0) {
      await tx.budgetItemVisit.createMany({
        data: toAdd.map((budgetItemId) => ({ budgetItemId, visitTemplateId: visitId })),
      });
    }
  });

  revalidatePath(`/pesquisas/${studyId}/configurar/cronograma`);
  revalidatePath(`/pesquisas/${studyId}/configurar/cronograma/${visitId}`);
  redirect(`/pesquisas/${studyId}/configurar/cronograma`);
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
    data: { wizardStep: adv(study, 6) },
  });
  redirect(`/pesquisas/${studyId}/configurar/revisao`);
}

// =============================================================================
// PASSO 4 - catalogo de itens (antes do cronograma)
// =============================================================================
export async function addBudgetItem(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const unitAmount = parseFloat(String(formData.get("unitAmount") ?? "0")) || 0;
  const boundToVisit = String(formData.get("boundToVisit") ?? "yes") === "yes";

  // Defaults silenciosos para os campos avancados (a UI simplificada nao expoe).
  const kind = boundToVisit ? "VISIT" : "OTHER";
  const method = "PER_OCCURRENCE";
  const defaultQuantity = 1;
  const billingModeRaw = String(formData.get("billingMode") ?? "SPONSOR_EDC");
  const billingMode =
    billingModeRaw === "SITE_PASS_THROUGH" ? "SITE_PASS_THROUGH" : "SPONSOR_EDC";
  const requiresInvoice = billingMode === "SITE_PASS_THROUGH";
  const autoTrigger = false;
  const appliesToAllVisits = false;
  const visitTemplateIds: string[] = [];

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

  const created = await prisma.budgetItem.create({
    data: {
      contractVersionId: contract.id,
      name,
      description,
      kind,
      method,
      unitAmount,
      defaultQuantity,
      currency: contract.currency,
      visitTemplateId: effectiveVisitIds[0] ?? null,
      appliesToAllVisits,
      autoTrigger,
      requiresInvoice,
      billingMode,
      boundToVisit,
      visits: {
        create: effectiveVisitIds.map((id) => ({ visitTemplateId: id })),
      },
    },
  });

  // Historico inicial de preco (necessario para reajustes/renegociacoes futuras)
  await prisma.budgetItemPrice.create({
    data: {
      budgetItemId: created.id,
      effectiveFrom: contract.effectiveDate,
      unitAmount,
      reasonKind: "INITIAL",
      reason: "Preco inicial do item",
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
    data: { wizardStep: adv(study, 5) },
  });
  redirect(`/pesquisas/${studyId}/configurar/cronograma`);
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
