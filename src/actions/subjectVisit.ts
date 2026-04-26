"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  buildOptionalValuesFromForm,
  parseOptionalFieldDefs,
} from "@/lib/visit-optional";

const VISIT_STATUSES = new Set(["SCHEDULED", "COMPLETED", "MISSED", "CANCELLED"]);

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
