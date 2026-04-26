import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Card, StatCard, Table, Th, Td } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { formatDate, formatMoney, kindLabel } from "@/lib/format";

export default async function DashboardPage() {
  const [studies, subjects, lines, batches] = await Promise.all([
    prisma.study.findMany({ orderBy: { createdAt: "desc" }, include: { sponsor: true } }),
    prisma.subject.findMany(),
    prisma.billableLine.findMany({
      include: {
        budgetItem: true,
        subject: true,
        batch: true,
      },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.batch.findMany({ include: { study: true } }),
  ]);

  const totalGross = lines.reduce((s, l) => s + l.grossAmount, 0);
  const totalHoldback = lines.reduce((s, l) => s + l.holdbackAmount, 0);
  const totalNet = lines.reduce((s, l) => s + l.netAmount, 0);
  const totalPaid = lines
    .filter((l) => l.status === "PAID")
    .reduce((s, l) => s + l.netAmount, 0);
  const totalPending = lines
    .filter((l) => ["READY", "IN_BATCH", "INVOICED"].includes(l.status))
    .reduce((s, l) => s + l.netAmount, 0);
  const totalDraft = lines
    .filter((l) => l.status === "DRAFT")
    .reduce((s, l) => s + l.netAmount, 0);

  const subjectsActive = subjects.filter((s) => s.status === "ACTIVE").length;

  return (
    <>
      <PageHeader
        title="Visao geral"
        description="Resumo financeiro e operacional dos estudos ativos"
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard label="Pesquisas ativas" value={String(studies.length)} sub={`${subjectsActive} pacientes ativos`} tone="primary" />
        <StatCard label="Faturado bruto" value={formatMoney(totalGross)} sub={`Holdback retido: ${formatMoney(totalHoldback)}`} />
        <StatCard label="A receber (liquido)" value={formatMoney(totalPending)} sub={`Rascunhos: ${formatMoney(totalDraft)}`} tone="warning" />
        <StatCard label="Recebido" value={formatMoney(totalPaid)} sub={`${batches.length} lotes emitidos`} tone="success" />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 16,
          marginTop: 18,
        }}
      >
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: "8px 0 10px" }}>
            Pesquisas
          </h2>
          <Table>
            <thead>
              <tr>
                <Th>Protocolo</Th>
                <Th>Estudo</Th>
                <Th>Patrocinador</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {studies.map((s) => (
                <tr key={s.id}>
                  <Td bold mono>
                    <Link href={`/pesquisas/${s.id}`} style={{ color: "var(--color-primary)" }}>
                      {s.protocolNumber}
                    </Link>
                  </Td>
                  <Td>{s.shortTitle ?? s.title}</Td>
                  <Td>{s.sponsor?.name ?? "-"}</Td>
                  <Td><StatusPill status={s.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: "8px 0 10px" }}>
            Lotes recentes
          </h2>
          <Table>
            <thead>
              <tr>
                <Th>Lote</Th>
                <Th>Mes ref.</Th>
                <Th align="right">Total liquido</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td></tr>
              ) : batches.map((b) => (
                <tr key={b.id}>
                  <Td bold mono>
                    <Link href={`/lotes/${b.id}`} style={{ color: "var(--color-primary)" }}>
                      {b.batchNumber}
                    </Link>
                  </Td>
                  <Td>{b.referenceMonth ?? "-"}</Td>
                  <Td align="right" mono>{formatMoney(b.totalNet, b.currency)}</Td>
                  <Td><StatusPill status={b.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 600, margin: "24px 0 10px" }}>
        Lancamentos recentes
      </h2>
      <Card padding={0}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <Th>Data</Th>
              <Th>Item</Th>
              <Th>Tipo</Th>
              <Th>Paciente</Th>
              <Th align="right">Bruto</Th>
              <Th align="right">Holdback</Th>
              <Th align="right">Liquido</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {lines.slice(0, 10).map((l) => (
              <tr key={l.id}>
                <Td mono>{formatDate(l.occurredAt)}</Td>
                <Td>{l.budgetItem.name}</Td>
                <Td>{kindLabel(l.budgetItem.kind)}</Td>
                <Td mono>{l.subject?.subjectCode ?? "-"}</Td>
                <Td align="right" mono>{formatMoney(l.grossAmount, l.currency)}</Td>
                <Td align="right" mono>{formatMoney(l.holdbackAmount, l.currency)}</Td>
                <Td align="right" mono bold>{formatMoney(l.netAmount, l.currency)}</Td>
                <Td><StatusPill status={l.status} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
