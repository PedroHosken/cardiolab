import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Card, StatCard, Th, Td } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { formatDate, formatMoney, kindLabel } from "@/lib/format";
import { markBatchPaid } from "../actions";

export default async function BatchDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      study: { include: { sponsor: true, cro: true } },
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

  const markPaidAction = async () => {
    "use server";
    await markBatchPaid(id);
  };

  return (
    <>
      <PageHeader
        title={`Lote ${batch.batchNumber}`}
        description={`Pesquisa ${batch.study.protocolNumber} · Mes ${batch.referenceMonth ?? "-"} · CRO pagadora: ${batch.study.cro?.name ?? "-"}`}
        actions={
          batch.status !== "PAID" ? (
            <form action={markPaidAction}>
              <button
                type="submit"
                style={{
                  padding: "10px 16px",
                  background: "var(--color-success)",
                  color: "white",
                  border: 0,
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Marcar lote como PAGO
              </button>
            </form>
          ) : (
            <span className="pill pill-success" style={{ fontSize: 12 }}>
              Lote pago em {formatDate(batch.paidDate)}
            </span>
          )
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard label="Status" value={batch.status} tone={batch.status === "PAID" ? "success" : "warning"} />
        <StatCard label="Bruto" value={formatMoney(batch.totalGross, batch.currency)} />
        <StatCard label="Holdback" value={formatMoney(batch.totalHoldback, batch.currency)} tone="warning" />
        <StatCard label="Liquido" value={formatMoney(batch.totalNet, batch.currency)} tone="primary" />
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 600, margin: "24px 0 10px" }}>
        Linhas do lote ({batch.billableLines.length})
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
                <Td><StatusPill status={l.status} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p style={{ marginTop: 16, fontSize: 11, color: "var(--color-muted)" }}>
        Quando voce marca o lote como pago, todas as linhas mudam para status <code>PAID</code> automaticamente, e o evento e registrado no Audit Log (LGPD/21 CFR Part 11).
      </p>
    </>
  );
}
