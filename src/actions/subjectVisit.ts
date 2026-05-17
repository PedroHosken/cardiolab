"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  buildOptionalValuesFromForm,
  parseOptionalFieldDefs,
} from "@/lib/visit-optional";
import {
  syncVisitBillableLines,
  type AdHocProcedureInput,
  type CatalogProcedureInput,
} from "@/lib/visit-billing";

const VISIT_STATUSES = new Set(["SCHEDULED", "COMPLETED", "MISSED", "CANCELLED"]);

type ProcedurePayload = {
  performedIds: string[];
  extraIds: string[];
  adhoc: Array<{ name: string; unitAmount: number; description?: string }>;
};

function parseProcedurePayload(raw: string): ProcedurePayload {
  try {
    const data = JSON.parse(raw) as ProcedurePayload;
    return {
      performedIds: Array.isArray(data.performedIds) ? data.performedIds : [],
      extraIds: Array.isArray(data.extraIds) ? data.extraIds : [],
      adhoc: Array.isArray(data.adhoc) ? data.adhoc : [],
    };
  } catch {
    return { performedIds: [], extraIds: [], adhoc: [] };
  }
}

/** Salva visita com procedimentos realizados e gera/atualiza lancamentos faturaveis. */
export async function saveSubjectVisit(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const subjectId = String(formData.get("subjectId"));
  const visitId = String(formData.get("visitId"));
  const visitDateRaw = String(formData.get("visitDate") ?? "").trim();
  const notes = String(formData.get("visitNotes") ?? "").trim() || null;
  const payloadRaw = String(formData.get("procedurePayload") ?? "{}");

  if (!studyId || !subjectId || !visitId) throw new Error("Dados incompletos");
  if (!visitDateRaw) throw new Error("Informe a data da visita");

  const payload = parseProcedurePayload(payloadRaw);
  const occurredAt = new Date(`${visitDateRaw}T12:00:00`);

  const visit = await prisma.subjectVisit.findFirst({
    where: { id: visitId, subjectId },
    include: {
      subject: true,
      visitTemplate: {
        include: { budgetItemLinks: true },
      },
      billableLines: true,
    },
  });
  if (!visit || visit.subject.studyId !== studyId) throw new Error("Visita nao encontrada");

  const linkedIds = new Set(visit.visitTemplate.budgetItemLinks.map((l) => l.budgetItemId));
  const allowedIds = new Set([...linkedIds, ...payload.extraIds]);

  const catalogPerformed: CatalogProcedureInput[] = payload.performedIds
    .filter((id) => allowedIds.has(id))
    .map((budgetItemId) => ({ budgetItemId }));

  const adHocPerformed: AdHocProcedureInput[] = payload.adhoc
    .filter((a) => a.name.trim() && a.unitAmount > 0)
    .map((a) => ({
      name: a.name.trim(),
      unitAmount: a.unitAmount,
      description: a.description?.trim() || undefined,
    }));

  await prisma.subjectVisit.update({
    where: { id: visitId },
    data: {
      visitDate: occurredAt,
      status: "COMPLETED",
      notes,
    },
  });

  await syncVisitBillableLines({
    subjectVisitId: visitId,
    subjectId,
    studyId,
    occurredAt,
    catalogPerformed,
    adHocPerformed,
    notes,
  });

  await prisma.auditLog.create({
    data: {
      entity: "SubjectVisit",
      entityId: visitId,
      action: "COMPLETE",
      after: JSON.stringify({
        performedCount: catalogPerformed.length,
        adHocCount: adHocPerformed.length,
        visitDate: visitDateRaw,
      }),
      notes: `Visita ${visit.visitTemplate.code} registrada como realizada`,
    },
  });

  revalidatePath(`/pesquisas/${studyId}/pacientes/${subjectId}`);
  revalidatePath(`/pesquisas/${studyId}/pacientes/${subjectId}/visitas/${visitId}`);
  revalidatePath(`/pesquisas/${studyId}/pacientes`);
  revalidatePath(`/pesquisas/${studyId}/financeiro`);

  redirect(`/pesquisas/${studyId}/pacientes/${subjectId}?saved=visit`);
}

export async function updateSubjectVisit(formData: FormData) {
  const studyId = String(formData.get("studyId"));
  const subjectId = String(formData.get("subjectId"));
  const visitId = String(formData.get("visitId"));
  const visitDateRaw = String(formData.get("visitDate") ?? "").trim();
  const status = String(formData.get("status") ?? "SCHEDULED");
  const notes = String(formData.get("visitNotes") ?? "").trim() || null;

  if (!studyId || !subjectId || !visitId) throw new Error("Dados incompletos");
  if (!VISIT_STATUSES.has(status)) throw new Error("Status de visita invalido");

  const visit = await prisma.subjectVisit.findFirst({
    where: { id: visitId, subjectId },
    include: { subject: true, visitTemplate: true },
  });
  if (!visit || visit.subject.studyId !== studyId) throw new Error("Visita nao encontrada");

  const defs = parseOptionalFieldDefs(visit.visitTemplate.optionalFieldDefs);
  const optionalValues = buildOptionalValuesFromForm(formData, defs);

  await prisma.subjectVisit.update({
    where: { id: visitId },
    data: {
      visitDate: visitDateRaw ? new Date(`${visitDateRaw}T12:00:00`) : null,
      status,
      notes,
      optionalValues: JSON.stringify(optionalValues),
    },
  });

  await prisma.auditLog.create({
    data: {
      entity: "SubjectVisit",
      entityId: visitId,
      action: "UPDATE",
      after: JSON.stringify({ status, visitDate: visitDateRaw || null, optionalKeys: Object.keys(optionalValues) }),
      notes: `Visita ${visit.visitTemplate.code} atualizada`,
    },
  });

  revalidatePath(`/pesquisas/${studyId}/pacientes/${subjectId}`);
  revalidatePath(`/pesquisas/${studyId}/visitas`);
  revalidatePath(`/pesquisas/${studyId}/pacientes`);
}
