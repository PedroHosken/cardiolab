import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, StatCard, Th, Td } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { formatDate, formatMoney } from "@/lib/format";
import { generatePendingBatch } from "./actions";

export default async function LotesStudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) notFound();

  const batches = await prisma.batch.findMany({
    where: { studyId: id },
    include: { _count: { select: { billableLines: true } } },
    orderBy: { createdAt: "desc" },
  });

  const pendingLines = await prisma.billableLine.count({
    where: {
      status: "READY",
      batchId: null,
      OR: [{ subject: { studyId: id } }, { subjectId: null }],
    },
  });

  const totalEmitted = batches.reduce((s, b) => s + b.totalGross, 0);
  const totalPaid = batches
    .filter((b) => b.status === "PAID")
    .reduce((s, b) => s + b.totalPaid, 0);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard label="Lotes" value={String(batches.length)} tone="primary" />
        <StatCard label="Faturado bruto total" value={formatMoney(totalEmitted)} />
        <StatCard label="Recebido" value={formatMoney(totalPaid)} tone="success" />
        <StatCard
          label="Linhas prontas (sem lote)"
          value={String(pendingLines)}
          sub="Aguardando geracao de batch"
          tone={pendingLines > 0 ? "warning" : "default"}
        />
      </div>

      <Card>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", marginBottom: 10 }}>
          Gerar lote de pendentes
        </h3>
        <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "4px 0 12px" }}>
          Reune todos os lancamentos com status <strong>READY</strong> que ainda nao estao em lote.
        </p>
        <form action={generatePendingBatch} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <input type="hidden" name="studyId" value={study.id} />
          <div>
            <label style={{ fontSize: 12, color: "var(--color-muted)", display: "block", marginBottom: 4 }}>
              Mes referencia
            </label>
            <input
              type="month"
              name="referenceMonth"
              defaultValue={new Date().toISOString().slice(0, 7)}
              style={{ padding: "8px 10px", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 13 }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: "8px 16px",
              background: "var(--color-primary)",
              color: "white",
              border: 0,
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
            disabled={pendingLines === 0}
          >
            Gerar lote ({pendingLines} linhas)
          </button>
        </form>
      </Card>

      <h2 style={{ fontSize: 14, fontWeight: 600, margin: "24px 0 10px" }}>
        Historico de lotes
      </h2>
      <Card padding={0}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <Th>Numero</Th>
              <Th>Status</Th>
              <Th>Mes ref.</Th>
              <Th align="center">Linhas</Th>
              <Th align="right">Bruto</Th>
              <Th align="right">Holdback</Th>
              <Th align="right">Liquido</Th>
              <Th>Pago em</Th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr>
                <Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td>
              </tr>
            ) : batches.map((b) => (
              <tr key={b.id}>
                <Td bold mono>
                  <Link href={`/pesquisas/${id}/lotes/${b.id}`} style={{ color: "var(--color-primary)" }}>
                    {b.batchNumber}
                  </Link>
                </Td>
                <Td><StatusPill status={b.status} /></Td>
                <Td mono>{b.referenceMonth ?? "-"}</Td>
                <Td align="center" mono>{b._count.billableLines}</Td>
                <Td align="right" mono>{formatMoney(b.totalGross, b.currency)}</Td>
                <Td align="right" mono>{formatMoney(b.totalHoldback, b.currency)}</Td>
                <Td align="right" mono bold>{formatMoney(b.totalNet, b.currency)}</Td>
                <Td>{formatDate(b.paidDate)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
