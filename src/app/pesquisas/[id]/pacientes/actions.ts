"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatSubjectRegistrationCode } from "@/lib/subject-code";

// =============================================================================
// 1) Adicionar paciente em triagem (codigo = prefixo do estudo + sequencia)
// =============================================================================
export async function addSubject(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const screeningDate = String(formData.get("screeningDate") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!studyId) throw new Error("Pesquisa invalida");

  const study = await prisma.study.findUnique({ where: { id: studyId } });
  if (!study) throw new Error("Pesquisa nao encontrada");
  if (study.status === "PLANNING") {
    throw new Error("Ative a pesquisa antes de cadastrar pacientes");
  }

  const prefix = (study.subjectCodePrefix ?? "").trim() || `${study.protocolNumber}-`;
  const pad = Math.min(
    10,
    Math.max(1, Math.floor(Number(study.subjectCodePadLength ?? 3)) || 3)
  );

  const subject = await prisma.$transaction(async (tx) => {
    const locked = await tx.study.findUnique({ where: { id: studyId } });
    if (!locked) throw new Error("Pesquisa nao encontrada");

    // Evita NaN no update (ex.: campo ausente no client Prisma antigo ou NULL inesperado no SQLite)
    let n = Math.max(1, Math.floor(Number(locked.subjectCodeNextNumber ?? 1)) || 1);
    let subjectCode = formatSubjectRegistrationCode(prefix, n, pad);
    let guard = 0;
    while (guard < 5000) {
      const taken = await tx.subject.findFirst({ where: { studyId, subjectCode } });
      if (!taken) break;
      n += 1;
      subjectCode = formatSubjectRegistrationCode(prefix, n, pad);
      guard += 1;
    }
    if (guard >= 5000) throw new Error("Nao foi possivel gerar codigo unico");

    const nextSeq = n + 1;
    if (!Number.isFinite(nextSeq) || nextSeq < 1) {
      throw new Error("Sequencia de registro invalida — rode `npx prisma generate` e reinicie o servidor");
    }

    const created = await tx.subject.create({
      data: {
        studyId,
        subjectCode,
        status: "SCREENING",
        enrolledAt: screeningDate ? new Date(screeningDate) : new Date(),
        notes,
      },
    });

    await tx.study.update({
      where: { id: studyId },
      data: { subjectCodeNextNumber: nextSeq },
    });

    await tx.auditLog.create({
      data: {
        entity: "Subject",
        entityId: created.id,
        action: "CREATE",
        after: JSON.stringify({ status: "SCREENING", subjectCode }),
        notes: "Paciente adicionado em triagem (codigo sequencial)",
      },
    });

    return created;
  });

  revalidatePath(`/pesquisas/${studyId}/pacientes`);
  redirect(`/pesquisas/${studyId}/pacientes/${subject.id}`);
}

// =============================================================================
// 2) Randomizar paciente -> cria SubjectVisits para todas as visitas do estudo
// =============================================================================
export async function randomizeSubject(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const subjectId = String(formData.get("subjectId"));
  const randomizationDate = String(formData.get("randomizationDate") ?? "");

  if (!studyId || !subjectId) throw new Error("Dados invalidos");

  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) throw new Error("Paciente nao encontrado");
  if (subject.status !== "SCREENING") {
    throw new Error("So e possivel randomizar pacientes em triagem");
  }

  const date = randomizationDate ? new Date(randomizationDate) : new Date();

  const visitTemplates = await prisma.visitTemplate.findMany({
    where: { studyId },
    orderBy: { orderIndex: "asc" },
  });

  await prisma.$transaction(async (tx) => {
    await tx.subject.update({
      where: { id: subjectId },
      data: { status: "RANDOMIZED", randomizedAt: date },
    });

    // Cria SubjectVisits programadas para todas as visitas
    if (visitTemplates.length > 0) {
      await tx.subjectVisit.createMany({
        data: visitTemplates.map((v) => ({
          subjectId,
          visitTemplateId: v.id,
          status: "SCHEDULED",
        })),
      });
    }

    await tx.auditLog.create({
      data: {
        entity: "Subject",
        entityId: subjectId,
        action: "STATUS_CHANGE",
        before: JSON.stringify({ status: "SCREENING" }),
        after: JSON.stringify({ status: "RANDOMIZED", randomizedAt: date }),
        notes: `Randomizado - ${visitTemplates.length} visitas programadas`,
      },
    });
  });

  revalidatePath(`/pesquisas/${studyId}/pacientes`);
  revalidatePath(`/pesquisas/${studyId}/pacientes/${subjectId}`);
  revalidatePath(`/pesquisas/${studyId}/visitas`);
}

// =============================================================================
// 3) Marcar como falha de triagem -> gera billable line se houver item SCREEN_FAIL
// =============================================================================
export async function markScreenFailure(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const subjectId = String(formData.get("subjectId"));
  const failureDate = String(formData.get("failureDate") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!studyId || !subjectId) throw new Error("Dados invalidos");

  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) throw new Error("Paciente nao encontrado");
  if (subject.status !== "SCREENING") {
    throw new Error("So e possivel marcar falha de triagem em pacientes em triagem");
  }

  const date = failureDate ? new Date(failureDate) : new Date();

  // Procura item de orcamento SCREEN_FAIL na versao ativa do contrato
  const contract = await prisma.contractVersion.findFirst({
    where: { studyId, isActive: true },
  });
  const screenFailItem = contract
    ? await prisma.budgetItem.findFirst({
        where: { contractVersionId: contract.id, kind: "SCREEN_FAIL" },
      })
    : null;

  await prisma.$transaction(async (tx) => {
    await tx.subject.update({
      where: { id: subjectId },
      data: {
        status: "SCREEN_FAIL",
        exitedAt: date,
        notes: reason ? `${subject.notes ? subject.notes + "\n" : ""}Falha de triagem: ${reason}` : subject.notes,
      },
    });

    if (screenFailItem && contract) {
      const gross = screenFailItem.unitAmount * screenFailItem.defaultQuantity;
      const hold = +(gross * (contract.holdbackPercent / 100)).toFixed(2);
      const net = +(gross - hold).toFixed(2);

      await tx.billableLine.create({
        data: {
          budgetItemId: screenFailItem.id,
          subjectId,
          occurredAt: date,
          quantity: screenFailItem.defaultQuantity,
          grossAmount: gross,
          holdbackAmount: hold,
          netAmount: net,
          currency: contract.currency,
          status: "READY",
          description: reason ? `Falha de triagem: ${reason}` : "Falha de triagem",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        entity: "Subject",
        entityId: subjectId,
        action: "STATUS_CHANGE",
        before: JSON.stringify({ status: "SCREENING" }),
        after: JSON.stringify({ status: "SCREEN_FAIL", exitedAt: date }),
        notes: `Falha de triagem${reason ? `: ${reason}` : ""}${screenFailItem ? ` - billable line gerada (${screenFailItem.name})` : ""}`,
      },
    });
  });

  revalidatePath(`/pesquisas/${studyId}/pacientes`);
  revalidatePath(`/pesquisas/${studyId}/pacientes/${subjectId}`);
  revalidatePath(`/pesquisas/${studyId}/lancamentos`);
}

// =============================================================================
// 4) Descontinuar paciente em estudo
// =============================================================================
export async function discontinueSubject(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const subjectId = String(formData.get("subjectId"));
  const exitDate = String(formData.get("exitDate") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!studyId || !subjectId) throw new Error("Dados invalidos");
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) throw new Error("Paciente nao encontrado");
  if (!["RANDOMIZED", "ACTIVE"].includes(subject.status)) {
    throw new Error("Paciente nao esta em estudo");
  }

  await prisma.$transaction(async (tx) => {
    await tx.subject.update({
      where: { id: subjectId },
      data: {
        status: "DISCONTINUED",
        exitedAt: exitDate ? new Date(exitDate) : new Date(),
        notes: reason ? `${subject.notes ? subject.notes + "\n" : ""}Descontinuado: ${reason}` : subject.notes,
      },
    });
    // Cancela visitas ainda nao concluidas
    await tx.subjectVisit.updateMany({
      where: { subjectId, status: "SCHEDULED" },
      data: { status: "CANCELLED" },
    });
    await tx.auditLog.create({
      data: {
        entity: "Subject",
        entityId: subjectId,
        action: "STATUS_CHANGE",
        before: JSON.stringify({ status: subject.status }),
        after: JSON.stringify({ status: "DISCONTINUED" }),
        notes: reason ? `Descontinuado: ${reason}` : "Descontinuado",
      },
    });
  });

  revalidatePath(`/pesquisas/${studyId}/pacientes`);
  revalidatePath(`/pesquisas/${studyId}/pacientes/${subjectId}`);
  revalidatePath(`/pesquisas/${studyId}/visitas`);
}

// =============================================================================
// 5) Concluir paciente (todas as visitas finalizadas)
// =============================================================================
export async function completeSubject(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const subjectId = String(formData.get("subjectId"));
  const exitDate = String(formData.get("exitDate") ?? "");

  if (!studyId || !subjectId) throw new Error("Dados invalidos");
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) throw new Error("Paciente nao encontrado");
  if (!["RANDOMIZED", "ACTIVE"].includes(subject.status)) {
    throw new Error("Paciente nao esta em estudo");
  }

  await prisma.subject.update({
    where: { id: subjectId },
    data: {
      status: "COMPLETED",
      exitedAt: exitDate ? new Date(exitDate) : new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      entity: "Subject",
      entityId: subjectId,
      action: "STATUS_CHANGE",
      before: JSON.stringify({ status: subject.status }),
      after: JSON.stringify({ status: "COMPLETED" }),
      notes: "Pesquisa concluida pelo paciente",
    },
  });

  revalidatePath(`/pesquisas/${studyId}/pacientes`);
  revalidatePath(`/pesquisas/${studyId}/pacientes/${subjectId}`);
}
