import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { VisitProcedureEditor, type AdHocRow, type CatalogItemRow } from "@/components/VisitProcedureEditor";
import { isLineLocked } from "@/lib/visit-billing";
import { parseAdHocFromLine, isAdHocLine } from "@/lib/visit-adhoc";

export default async function SubjectVisitDetailPage({
  params,
}: {
  params: Promise<{ id: string; subjectId: string; visitId: string }>;
}) {
  const { id, subjectId, visitId } = await params;

  const visit = await prisma.subjectVisit.findFirst({
    where: { id: visitId, subjectId },
    include: {
      subject: true,
      visitTemplate: {
        include: {
          budgetItemLinks: {
            include: { budgetItem: true },
            orderBy: { budgetItem: { name: "asc" } },
          },
        },
      },
      billableLines: { include: { budgetItem: true } },
    },
  });
  if (!visit || visit.subject.studyId !== id) notFound();

  const contract = await prisma.contractVersion.findFirst({
    where: { studyId: id, isActive: true },
    include: {
      budgetItems: {
        where: { boundToVisit: true },
        orderBy: { name: "asc" },
      },
    },
  });

  const currency = contract?.currency ?? "USD";
  const linkedIds = new Set(visit.visitTemplate.budgetItemLinks.map((l) => l.budgetItemId));

  const linkedItems: CatalogItemRow[] = visit.visitTemplate.budgetItemLinks.map((l) => ({
    id: l.budgetItem.id,
    code: l.budgetItem.code ?? l.budgetItem.kind,
    name: l.budgetItem.name,
    unitAmount: l.budgetItem.unitAmount,
  }));

  const catalogPool: CatalogItemRow[] = (contract?.budgetItems ?? []).map((b) => ({
    id: b.id,
    code: b.code ?? b.kind,
    name: b.name,
    unitAmount: b.unitAmount,
  }));

  const catalogLineIds = visit.billableLines
    .filter((l) => !isAdHocLine(l.description))
    .map((l) => l.budgetItemId);

  const isCompleted = visit.status === "COMPLETED";

  let initialPerformedIds: string[];
  let initialExtraIds: string[];

  if (isCompleted) {
    initialPerformedIds = [...new Set(catalogLineIds.filter((bid) => linkedIds.has(bid)))];
    initialExtraIds = [...new Set(catalogLineIds.filter((bid) => !linkedIds.has(bid)))];
    if (initialPerformedIds.length === 0 && linkedItems.length > 0) {
      initialPerformedIds = linkedItems.map((i) => i.id);
    }
  } else {
    initialPerformedIds = linkedItems.map((i) => i.id);
    initialExtraIds = [];
  }

  const initialAdHoc: AdHocRow[] = visit.billableLines
    .filter((l) => isAdHocLine(l.description))
    .map((l) => parseAdHocFromLine(l.description, l.grossAmount, l.quantity))
    .filter((r): r is AdHocRow => r !== null);

  const lockedLineCount = visit.billableLines.filter((l) => isLineLocked(l.status)).length;

  const visitDate = visit.visitDate
    ? new Date(visit.visitDate).toISOString().slice(0, 10)
    : null;
  const scheduledDate = visit.visitDate
    ? visitDate
    : null;

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Link
          href={`/pesquisas/${id}/pacientes/${subjectId}`}
          style={{ fontSize: 12, color: "var(--color-muted)" }}
        >
          ← {visit.subject.subjectCode}
        </Link>
        <h1 style={{ margin: "8px 0 0", fontSize: 18, fontWeight: 700 }}>
          {visit.visitTemplate.code} · {visit.visitTemplate.name}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-muted)" }}>
          Registre os procedimentos realizados, observacoes e valores a receber.
        </p>
      </div>

      <Card>
        <VisitProcedureEditor
          studyId={id}
          subjectId={subjectId}
          visitId={visitId}
          visitCode={visit.visitTemplate.code}
          visitName={visit.visitTemplate.name}
          visitKind={visit.visitTemplate.visitKind}
          visitStatus={visit.status}
          visitDate={visitDate}
          scheduledDate={scheduledDate}
          windowDays={visit.visitTemplate.windowDays}
          notes={visit.notes}
          currency={currency}
          linkedItems={linkedItems}
          initialPerformedIds={initialPerformedIds}
          initialExtraIds={initialExtraIds}
          initialAdHoc={initialAdHoc}
          catalogPool={catalogPool}
          lockedLineCount={lockedLineCount}
          isCompleted={isCompleted}
        />
      </Card>
    </>
  );
}
