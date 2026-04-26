"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function updateChecklistItem(formData: FormData) {
  const itemId = formData.get("itemId") as string;
  const studyId = formData.get("studyId") as string;
  const status = formData.get("status") as string;
  const notes = (formData.get("notes") as string) ?? "";

  if (!itemId || !studyId) throw new Error("Item invalido");

  const before = await prisma.studyChecklistItem.findUnique({ where: { id: itemId } });
  if (!before) throw new Error("Item nao encontrado");

  const updated = await prisma.studyChecklistItem.update({
    where: { id: itemId },
    data: {
      status: status || before.status,
      notes: notes.trim() === "" ? null : notes.trim(),
    },
  });

  await prisma.auditLog.create({
    data: {
      entity: "StudyChecklistItem",
      entityId: itemId,
      action: "UPDATE",
      before: JSON.stringify({ status: before.status, notes: before.notes }),
      after: JSON.stringify({ status: updated.status, notes: updated.notes }),
    },
  });

  revalidatePath(`/pesquisas/${studyId}/checklist`);
}
