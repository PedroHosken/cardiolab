import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, StatCard, Th, Td } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { formatDate, formatMoney, kindLabel } from "@/lib/format";

export default async function SubjectDetail({
  params,
}: {
  params: Promise<{ id: string; subjectId: string }>;
}) {
  const { id, subjectId } = await params;
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, studyId: id },
    include: {
      visits: {
        include: { visitTemplate: true },
        orderBy: { visitTemplate: { orderIndex: "asc" } },
      },
      billableLines: {
        include: { budgetItem: true },
        orderBy: { occurredAt: "desc" },
      },
    },
  });
  if (!subject) notFound();

  const total = subject.billableLines.reduce((s, l) => s + l.grossAmount, 0);
  const totalNet = subject.billableLines.reduce((s, l) => s + l.netAmount, 0);
  const totalPaid = subject.billableLines
    .filter((l) => l.status === "PAID")
    .reduce((s, l) => s + l.netAmount, 0);

  return (
    <>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <Link
          href={`/pesquisas/${id}/pacientes`}
          style={{ fontSize: 12, color: "var(--color-muted)" }}
        >
          ← Pacientes
        </Link>
        <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, fontSize: 16 }}>
          {subject.subjectCode}
        </span>
        <StatusPill status={subject.status} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard
          label="Visitas concluidas"
          value={String(subject.visits.filter((v) => v.status === "COMPLETED").length)}
          sub={`${subject.visits.length} agendadas`}
          tone="primary"
        />
        <StatCard label="Faturado bruto" value={formatMoney(total)} sub={`Liquido: ${formatMoney(totalNet)}`} />
        <StatCard label="Recebido" value={formatMoney(totalPaid)} tone="success" />
        <StatCard
          label="Inclusao"
          value={formatDate(subject.enrolledAt)}
          sub={`Random: ${formatDate(subject.randomizedAt)}`}
        />
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 600, margin: "24px 0 10px" }}>Visitas</h2>
      <Card padding={0}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <Th>Codigo</Th>
              <Th>Visita</Th>
              <Th>Data</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {subject.visits.map((v) => (
              <tr key={v.id}>
                <Td bold mono>{v.visitTemplate.code}</Td>
                <Td>{v.visitTemplate.name}</Td>
                <Td>{formatDate(v.visitDate)}</Td>
                <Td><StatusPill status={v.status} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <h2 style={{ fontSize: 14, fontWeight: 600, margin: "24px 0 10px" }}>
        Lancamentos faturaveis
      </h2>
      <Card padding={0}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <Th>Data</Th>
              <Th>Item</Th>
              <Th align="center">Tipo</Th>
              <Th align="right">Bruto</Th>
              <Th align="right">Holdback</Th>
              <Th align="right">Liquido</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {subject.billableLines.map((l) => (
              <tr key={l.id}>
                <Td mono>{formatDate(l.occurredAt)}</Td>
                <Td>
                  <div style={{ fontWeight: 600 }}>{l.budgetItem.name}</div>
                  {l.description ? <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{l.description}</div> : null}
                </Td>
                <Td align="center"><span className="pill pill-info">{kindLabel(l.budgetItem.kind)}</span></Td>
                <Td align="right" mono>{formatMoney(l.grossAmount)}</Td>
                <Td align="right" mono>{formatMoney(l.holdbackAmount)}</Td>
                <Td align="right" mono bold>{formatMoney(l.netAmount)}</Td>
                <Td><StatusPill status={l.status} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
