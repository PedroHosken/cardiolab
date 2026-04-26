import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, Th, Td } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { formatDate } from "@/lib/format";

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
    orderBy: { visitDate: "desc" },
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
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {visits.length === 0 ? (
            <tr>
              <Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td>
            </tr>
          ) : visits.map((v) => (
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
              <Td><StatusPill status={v.status} /></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
