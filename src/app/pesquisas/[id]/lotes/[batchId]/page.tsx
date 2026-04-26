import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, StatCard, Th, Td } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { formatDate, formatMoney, kindLabel } from "@/lib/format";
import { markBatchPaid } from "../actions";

export default async function BatchDetail({
  params,
}: {
  params: Promise<{ id: string; batchId: string }>;
}) {
  const { id, batchId } = await params;
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, studyId: id },
    include: {
      study: true,
      billableLines: {
        include: {
          budgetItem: true,
          subject: true,
        },
        orderBy: { occurredAt: "asc" },
      },
    },
  });
  if (!batch) notFound();

  return (
    <>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <Link
          href={`/pesquisas/${id}/lotes`}
          style={{ fontSize: 12, color: "var(--color-muted)" }}
        >
          ← Lotes
        </Link>
        <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, fontSize: 16 }}>
          {batch.batchNumber}
        </span>
        <StatusPill status={batch.status} />
        {batch.status !== "PAID" ? (
          <form action={markBatchPaid} style={{ marginLeft: "auto" }}>
            <input type="hidden" name="batchId" value={batch.id} />
            <input type="hidden" name="studyId" value={id} />
            <button
              type="submit"
              style={{
                padding: "8px 16px",
                background: "var(--color-success)",
                color: "white",
                border: 0,
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Marcar como pago
            </button>
          </form>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard label="Linhas" value={String(batch.billableLines.length)} />
        <StatCard label="Bruto" value={formatMoney(batch.totalGross, batch.currency)} />
        <StatCard label="Holdback" value={formatMoney(batch.totalHoldback, batch.currency)} tone="warning" />
        <StatCard
          label="Liquido"
          value={formatMoney(batch.totalNet, batch.currency)}
          tone={batch.status === "PAID" ? "success" : "primary"}
          sub={batch.paidDate ? `Pago em ${formatDate(batch.paidDate)}` : undefined}
        />
      </div>

      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, fontSize: 13 }}>
          <div><strong>Pesquisa:</strong> {batch.study.shortTitle ?? batch.study.title}</div>
          <div><strong>Mes ref.:</strong> {batch.referenceMonth ?? "-"}</div>
          <div><strong>Moeda:</strong> {batch.currency}</div>
          <div><strong>Emitido em:</strong> {formatDate(batch.createdAt)}</div>
          <div><strong>NF:</strong> {batch.invoiceRef ?? "-"}</div>
          <div><strong>Pago em:</strong> {formatDate(batch.paidDate)}</div>
        </div>
      </Card>

      <h2 style={{ fontSize: 14, fontWeight: 600, margin: "24px 0 10px" }}>
        Itens deste lote ({batch.billableLines.length})
      </h2>
      <Card padding={0}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <Th>Data</Th>
              <Th>Paciente</Th>
              <Th>Item</Th>
              <Th align="center">Tipo</Th>
              <Th align="right">Bruto</Th>
              <Th align="right">Holdback</Th>
              <Th align="right">Liquido</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {batch.billableLines.map((l) => (
              <tr key={l.id}>
                <Td mono>{formatDate(l.occurredAt)}</Td>
                <Td mono>
                  {l.subject ? (
                    <Link
                      href={`/pesquisas/${id}/pacientes/${l.subject.id}`}
                      style={{ color: "var(--color-primary)" }}
                    >
                      {l.subject.subjectCode}
                    </Link>
                  ) : "-"}
                </Td>
                <Td>
                  <div style={{ fontWeight: 600 }}>{l.budgetItem.name}</div>
                  {l.description ? <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{l.description}</div> : null}
                </Td>
                <Td align="center"><span className="pill pill-info">{kindLabel(l.budgetItem.kind)}</span></Td>
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
