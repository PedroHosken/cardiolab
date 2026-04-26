import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Card, StatCard, Th, Td } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { formatDate, formatMoney } from "@/lib/format";
import { generatePendingBatch } from "./actions";

export default async function LotesPage() {
  const [batches, studies, readyCount] = await Promise.all([
    prisma.batch.findMany({
      include: { study: true, _count: { select: { billableLines: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.study.findMany(),
    prisma.billableLine.count({ where: { status: "READY", batchId: null } }),
  ]);

  const totalNet = batches.reduce((s, b) => s + b.totalNet, 0);
  const totalPaid = batches.reduce((s, b) => s + b.totalPaid, 0);
  const totalPending = totalNet - totalPaid;

  return (
    <>
      <PageHeader
        title="Lotes / Faturas"
        description="Lotes de cobranca enviados ao patrocinador. Marque como pago quando o batch for liquidado."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard label="Lotes" value={String(batches.length)} sub={`${readyCount} linhas prontas para novo lote`} tone="primary" />
        <StatCard label="Total liquido emitido" value={formatMoney(totalNet)} />
        <StatCard label="Pago" value={formatMoney(totalPaid)} tone="success" />
        <StatCard label="A receber" value={formatMoney(totalPending)} tone="warning" />
      </div>

      <Card style={{ marginTop: 18 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Gerar novo lote com linhas pendentes</h3>
        <p style={{ margin: "6px 0 14px", fontSize: 12, color: "var(--color-muted)" }}>
          Agrupa todas as linhas com status READY (ainda nao incluidas em lote) da pesquisa selecionada.
        </p>
        <form action={generatePendingBatch} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select
            name="studyId"
            required
            style={{
              padding: "8px 10px",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              fontSize: 13,
              background: "white",
            }}
          >
            <option value="">Selecione a pesquisa...</option>
            {studies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.protocolNumber} — {s.shortTitle}
              </option>
            ))}
          </select>
          <input
            name="referenceMonth"
            placeholder="YYYY-MM (opcional)"
            style={{
              padding: "8px 10px",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              fontSize: 13,
              width: 160,
            }}
          />
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
          >
            Gerar lote
          </button>
        </form>
      </Card>

      <h2 style={{ fontSize: 14, fontWeight: 600, margin: "24px 0 10px" }}>
        Lotes existentes
      </h2>
      <Card padding={0}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <Th>Lote</Th>
              <Th>Pesquisa</Th>
              <Th>Mes ref.</Th>
              <Th align="center">Linhas</Th>
              <Th align="right">Bruto</Th>
              <Th align="right">Holdback</Th>
              <Th align="right">Liquido</Th>
              <Th align="right">Pago</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr>
                <Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td>
              </tr>
            ) : batches.map((b) => (
              <tr key={b.id}>
                <Td bold mono>
                  <Link href={`/lotes/${b.id}`} style={{ color: "var(--color-primary)" }}>
                    {b.batchNumber}
                  </Link>
                </Td>
                <Td mono>{b.study.protocolNumber}</Td>
                <Td>{b.referenceMonth ?? "-"}</Td>
                <Td align="center" mono>{b._count.billableLines}</Td>
                <Td align="right" mono>{formatMoney(b.totalGross, b.currency)}</Td>
                <Td align="right" mono>{formatMoney(b.totalHoldback, b.currency)}</Td>
                <Td align="right" mono bold>{formatMoney(b.totalNet, b.currency)}</Td>
                <Td align="right" mono>{formatMoney(b.totalPaid, b.currency)}</Td>
                <Td><StatusPill status={b.status} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
