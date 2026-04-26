import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Card, Th, Td } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { formatDate } from "@/lib/format";

export default async function VisitasPage() {
  const visits = await prisma.subjectVisit.findMany({
    include: {
      subject: { include: { study: true } },
      visitTemplate: true,
    },
    orderBy: { visitDate: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Visitas realizadas"
        description="Registro de visitas concluidas/agendadas — gatilho automatico para faturamento"
      />
      <Card padding={0}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <Th>Data</Th>
              <Th>Pesquisa</Th>
              <Th>Paciente</Th>
              <Th>Codigo</Th>
              <Th>Visita</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {visits.map((v) => (
              <tr key={v.id}>
                <Td mono>{formatDate(v.visitDate)}</Td>
                <Td mono>{v.subject.study.protocolNumber}</Td>
                <Td mono>
                  <Link href={`/pacientes/${v.subject.id}`} style={{ color: "var(--color-primary)" }}>
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
    </>
  );
}
