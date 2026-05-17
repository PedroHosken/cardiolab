import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, StatCard, Th, Td } from "@/components/Card";
import { FinanceiroTabs } from "@/components/FinanceiroTabs";
import { formatDate, formatMoney } from "@/lib/format";
import { StatusPill } from "@/components/StatusPill";

export default async function HoldbacksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) notFound();

  const contract = await prisma.contractVersion.findFirst({
    where: { studyId: id, isActive: true },
  });

  const lines = await prisma.billableLine.findMany({
    where: {
      budgetItem: { contractVersion: { studyId: id } },
      holdbackAmount: { gt: 0 },
    },
    include: { subject: true, budgetItem: true, batch: true },
    orderBy: { occurredAt: "desc" },
  });

  const totalGross = lines.reduce((s, l) => s + l.grossAmount, 0);
  const totalHold = lines.reduce((s, l) => s + l.holdbackAmount, 0);
  const totalNet = lines.reduce((s, l) => s + l.netAmount, 0);
  const released = 0; // a liberacao de holdback acontece no encerramento; placeholder

  return (
    <>
      <FinanceiroTabs studyId={id} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard
          label="Percentual configurado"
          value={`${(contract?.holdbackPercent ?? 0).toFixed(1)}%`}
          tone="primary"
        />
        <StatCard label="Faturado bruto" value={formatMoney(totalGross, contract?.currency)} />
        <StatCard
          label="Holdback retido"
          value={formatMoney(totalHold, contract?.currency)}
          tone="warning"
          sub={`Liquido pago/faturado: ${formatMoney(totalNet, contract?.currency)}`}
        />
        <StatCard
          label="Holdback liberado"
          value={formatMoney(released, contract?.currency)}
          tone="success"
          sub="Liberacao no closeout"
        />
      </div>

      <Card padding={0}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <Th>Data</Th>
              <Th>Paciente</Th>
              <Th>Item</Th>
              <Th align="right">Bruto</Th>
              <Th align="right">Holdback</Th>
              <Th align="right">Liquido</Th>
              <Th>Lote</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td>
              </tr>
            ) : lines.map((l) => (
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
                <Td>{l.budgetItem.name}</Td>
                <Td align="right" mono>{formatMoney(l.grossAmount, l.currency)}</Td>
                <Td align="right" mono bold style={{ color: "var(--color-warning)" }}>
                  {formatMoney(l.holdbackAmount, l.currency)}
                </Td>
                <Td align="right" mono>{formatMoney(l.netAmount, l.currency)}</Td>
                <Td mono>
                  {l.batch ? (
                    <Link
                      href={`/pesquisas/${id}/lotes/${l.batch.id}`}
                      style={{ color: "var(--color-primary)" }}
                    >
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
