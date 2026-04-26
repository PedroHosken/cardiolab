import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Card, Th, Td } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { formatDate, formatMoney } from "@/lib/format";

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ studyId?: string }>;
}) {
  const sp = await searchParams;
  const where = sp.studyId ? { studyId: sp.studyId } : {};

  const studies = await prisma.study.findMany();
  const subjects = await prisma.subject.findMany({
    where,
    include: {
      study: true,
      visits: { include: { visitTemplate: true } },
      billableLines: true,
    },
    orderBy: { subjectCode: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Pacientes"
        description="Participantes da pesquisa e suas visitas registradas"
      />

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--color-muted)" }}>Pesquisa:</span>
        <a
          href="/pacientes"
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            background: !sp.studyId ? "var(--color-primary)" : "var(--color-surface)",
            color: !sp.studyId ? "white" : "var(--color-foreground)",
            border: "1px solid var(--color-border)",
          }}
        >
          Todas
        </a>
        {studies.map((s) => (
          <a
            key={s.id}
            href={`/pacientes?studyId=${s.id}`}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              background: s.id === sp.studyId ? "var(--color-primary)" : "var(--color-surface)",
              color: s.id === sp.studyId ? "white" : "var(--color-foreground)",
              border: "1px solid var(--color-border)",
            }}
          >
            {s.protocolNumber}
          </a>
        ))}
      </div>

      <Card padding={0}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <Th>Codigo</Th>
              <Th>Pesquisa</Th>
              <Th>Status</Th>
              <Th>Inclusao</Th>
              <Th>Randomizacao</Th>
              <Th align="center">Visitas</Th>
              <Th align="center">Lancamentos</Th>
              <Th align="right">Faturado bruto</Th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => {
              const total = s.billableLines.reduce((sum, l) => sum + l.grossAmount, 0);
              return (
                <tr key={s.id}>
                  <Td bold mono>
                    <Link href={`/pacientes/${s.id}`} style={{ color: "var(--color-primary)" }}>
                      {s.subjectCode}
                    </Link>
                  </Td>
                  <Td mono>{s.study.protocolNumber}</Td>
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
    </>
  );
}
