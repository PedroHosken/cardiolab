import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, Th, Td } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { formatDate } from "@/lib/format";
import {
  asOptionalValuesRecord,
  parseOptionalFieldDefs,
  summarizeOptionalValues,
} from "@/lib/visit-optional";

export default async function VisitasStudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) notFound();

  const visits = await prisma.subjectVisit.findMany({
    where: { subject: { studyId: id } },
    include: { subject: true, visitTemplate: true },
    orderBy: [{ visitDate: "desc" }, { visitTemplate: { orderIndex: "asc" } }],
  });

  return (
    <Card padding={0}>
      <table style={{ width: "100%", fontSize: 13 }}>
        <thead>
          <tr>
            <Th>Data</Th>
            <Th>Paciente</Th>
            <Th>Codigo</Th>
            <Th>Visita</Th>
            <Th>Opcionais</Th>
            <Th>Notas</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {visits.length === 0 ? (
            <tr>
              <Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td>
            </tr>
          ) : visits.map((v) => {
            const defs = parseOptionalFieldDefs(v.visitTemplate.optionalFieldDefs);
            const optSumm = summarizeOptionalValues(defs, asOptionalValuesRecord(v.optionalValues));
            return (
              <tr key={v.id}>
                <Td mono>{formatDate(v.visitDate)}</Td>
                <Td mono>
                  <Link
                    href={`/pesquisas/${id}/pacientes/${v.subject.id}`}
                    style={{ color: "var(--color-primary)" }}
                  >
                    {v.subject.subjectCode}
                  </Link>
                </Td>
                <Td bold mono>{v.visitTemplate.code}</Td>
                <Td>{v.visitTemplate.name}</Td>
                <Td style={{ fontSize: 12, color: "var(--color-muted)", maxWidth: 200 }}>
                  {optSumm || "—"}
                </Td>
                <Td style={{ fontSize: 12, maxWidth: 220, whiteSpace: "pre-wrap" }}>
                  {v.notes?.trim() ? v.notes : "—"}
                </Td>
                <Td><StatusPill status={v.status} /></Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
