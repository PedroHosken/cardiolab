import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Card, StatCard, Th, Td } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { formatDate, formatMoney, kindLabel } from "@/lib/format";

const STATUS_FILTERS = [
  "DRAFT",
  "READY",
  "IN_BATCH",
  "INVOICED",
  "PAID",
  "HELD",
  "GLOSSED",
];

export default async function LancamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; studyId?: string }>;
}) {
  const sp = await searchParams;
  const where: { status?: string; subject?: { studyId: string } } = {};
  if (sp.status) where.status = sp.status;
  if (sp.studyId) where.subject = { studyId: sp.studyId };

  const lines = await prisma.billableLine.findMany({
    where,
    include: {
      budgetItem: true,
      subject: { include: { study: true } },
      batch: true,
    },
    orderBy: { occurredAt: "desc" },
  });

  const totalGross = lines.reduce((s, l) => s + l.grossAmount, 0);
  const totalNet = lines.reduce((s, l) => s + l.netAmount, 0);
  const totalHold = lines.reduce((s, l) => s + l.holdbackAmount, 0);

  // counts por status (sem filtro)
  const allLines = await prisma.billableLine.findMany({ select: { status: true } });
  const counts = STATUS_FILTERS.reduce<Record<string, number>>((acc, st) => {
    acc[st] = allLines.filter((l) => l.status === st).length;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Lancamentos faturaveis"
        description="Todas as linhas geradas pelo motor de faturamento. Filtre por status para preparar lotes."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard label="Linhas filtradas" value={String(lines.length)} />
        <StatCard label="Bruto" value={formatMoney(totalGross)} />
        <StatCard label="Holdback" value={formatMoney(totalHold)} tone="warning" />
        <StatCard label="Liquido" value={formatMoney(totalNet)} tone="primary" />
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "center", margin: "20px 0 10px", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--color-muted)", marginRight: 4 }}>Status:</span>
        <a
          href="/lancamentos"
          style={{
            padding: "5px 10px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: !sp.status ? "var(--color-primary)" : "var(--color-surface)",
            color: !sp.status ? "white" : "var(--color-foreground)",
            border: "1px solid var(--color-border)",
          }}
        >
          Todos ({allLines.length})
        </a>
        {STATUS_FILTERS.map((st) => (
          <a
            key={st}
            href={`/lancamentos?status=${st}`}
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              background: sp.status === st ? "var(--color-primary)" : "var(--color-surface)",
              color: sp.status === st ? "white" : "var(--color-foreground)",
              border: "1px solid var(--color-border)",
            }}
          >
            {st} ({counts[st] ?? 0})
          </a>
        ))}
      </div>

      <Card padding={0}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <Th>Data</Th>
              <Th>Estudo</Th>
              <Th>Paciente</Th>
              <Th>Item</Th>
              <Th align="center">Tipo</Th>
              <Th align="right">Bruto</Th>
              <Th align="right">Holdback</Th>
              <Th align="right">Liquido</Th>
              <Th>Lote</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <Td mono>{formatDate(l.occurredAt)}</Td>
                <Td mono>{l.subject?.study.protocolNumber ?? "-"}</Td>
                <Td mono>
                  {l.subject ? (
                    <Link href={`/pacientes/${l.subject.id}`} style={{ color: "var(--color-primary)" }}>
                      {l.subject.subjectCode}
                    </Link>
                  ) : "-"}
                </Td>
                <Td>
                  <div style={{ fontWeight: 600 }}>{l.budgetItem.name}</div>
                  {l.description ? <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{l.description}</div> : null}
                </Td>
                <Td align="center">
                  <span className="pill pill-info">{kindLabel(l.budgetItem.kind)}</span>
                </Td>
                <Td align="right" mono>{formatMoney(l.grossAmount, l.currency)}</Td>
                <Td align="right" mono>{formatMoney(l.holdbackAmount, l.currency)}</Td>
                <Td align="right" mono bold>{formatMoney(l.netAmount, l.currency)}</Td>
                <Td mono>
                  {l.batch ? (
                    <Link href={`/lotes/${l.batch.id}`} style={{ color: "var(--color-primary)" }}>
                      {l.batch.batchNumber}
                    </Link>
                  ) : "-"}
                </Td>
                <Td><StatusPill status={l.status} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
