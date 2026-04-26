import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, Th, Td } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { formatDate, formatMoney } from "@/lib/format";

export default async function PacientesStudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) notFound();

  const subjects = await prisma.subject.findMany({
    where: { studyId: id },
    include: {
      visits: true,
      billableLines: true,
    },
    orderBy: { subjectCode: "asc" },
  });

  return (
    <Card padding={0}>
      <table style={{ width: "100%", fontSize: 13 }}>
        <thead>
          <tr>
            <Th>Codigo</Th>
            <Th>Status</Th>
            <Th>Inclusao</Th>
            <Th>Randomizacao</Th>
            <Th align="center">Visitas</Th>
            <Th align="center">Lancamentos</Th>
            <Th align="right">Faturado bruto</Th>
          </tr>
        </thead>
        <tbody>
          {subjects.length === 0 ? (
            <tr>
              <Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td>
            </tr>
          ) : subjects.map((s) => {
            const total = s.billableLines.reduce((sum, l) => sum + l.grossAmount, 0);
            return (
              <tr key={s.id}>
                <Td bold mono>
                  <Link href={`/pesquisas/${id}/pacientes/${s.id}`} style={{ color: "var(--color-primary)" }}>
                    {s.subjectCode}
                  </Link>
                </Td>
                <Td><StatusPill status={s.status} /></Td>
                <Td>{formatDate(s.enrolledAt)}</Td>
                <Td>{formatDate(s.randomizedAt)}</Td>
                <Td align="center" mono>{s.visits.length}</Td>
                <Td align="center" mono>{s.billableLines.length}</Td>
                <Td align="right" mono>{formatMoney(total)}</Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
