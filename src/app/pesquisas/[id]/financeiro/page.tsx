import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, StatCard, Th, Td } from "@/components/Card";
import { FinanceiroTabs } from "@/components/FinanceiroTabs";
import { formatDate, formatMoney } from "@/lib/format";
import {
  buildPaymentPeriods,
  paymentFrequencyLabel,
  type PaymentFrequency,
} from "@/lib/payment-frequency";

export default async function FinanceiroOverview({
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

  return (
    <>
      <FinanceiroTabs studyId={id} />

      {!contract ? (
        <Card>
          <div style={{ color: "var(--color-danger)", fontSize: 14, fontWeight: 600 }}>
            Pesquisa sem contrato ativo. Configure no Passo 3 do assistente.
          </div>
        </Card>
      ) : !contract.paymentFrequency || !contract.paymentStartDate ? (
        <Card>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Ciclo de pagamentos</h2>
          <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 6 }}>
            Defina a <strong>frequencia</strong> e a <strong>data de inicio</strong> em
            Configuracoes → Passo 3 do contrato para que o sistema calcule os periodos e gere alertas.
          </p>
        </Card>
      ) : (
        <CyclesView
          studyId={id}
          frequency={contract.paymentFrequency as PaymentFrequency}
          startDate={contract.paymentStartDate}
          holdbackPercent={contract.holdbackPercent}
          currency={contract.currency}
        />
      )}
    </>
  );
}

async function CyclesView({
  studyId,
  frequency,
  startDate,
  holdbackPercent,
  currency,
}: {
  studyId: string;
  frequency: PaymentFrequency;
  startDate: Date;
  holdbackPercent: number;
  currency: string;
}) {
  const today = new Date();
  const horizon = new Date(today);
  horizon.setMonth(horizon.getMonth() + 12);
  const periods = buildPaymentPeriods(startDate, frequency, horizon);

  const allLines = await prisma.billableLine.findMany({
    where: { budgetItem: { contractVersion: { studyId } } },
    include: { subject: true, budgetItem: true },
    orderBy: { occurredAt: "asc" },
  });

  // Agrupa por periodo (occurredAt em [start, end))
  const groups = periods.map((p) => {
    const lines = allLines.filter(
      (l) => l.occurredAt >= p.start && l.occurredAt < p.end
    );
    const gross = lines.reduce((s, l) => s + l.grossAmount, 0);
    const hold = lines.reduce((s, l) => s + l.holdbackAmount, 0);
    const net = lines.reduce((s, l) => s + l.netAmount, 0);
    const overdue = p.dueDate <= today;
    const paidNet = lines
      .filter((l) => l.status === "PAID")
      .reduce((s, l) => s + l.netAmount, 0);
    return { period: p, lines, gross, hold, net, paidNet, overdue };
  });

  const overdueCount = groups.filter((g) => g.overdue && g.lines.length > 0 && g.paidNet < g.net).length;
  const totalGross = groups.reduce((s, g) => s + g.gross, 0);
  const totalHold = groups.reduce((s, g) => s + g.hold, 0);
  const totalNet = groups.reduce((s, g) => s + g.net, 0);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard
          label="Frequencia"
          value={paymentFrequencyLabel(frequency)}
          sub={`Inicio: ${formatDate(startDate)}`}
          tone="primary"
        />
        <StatCard
          label="Periodos vencidos"
          value={String(overdueCount)}
          tone={overdueCount > 0 ? "warning" : "default"}
          sub="Aguardando faturamento/pagamento"
        />
        <StatCard label="Holdback %" value={`${holdbackPercent.toFixed(1)}%`} />
        <StatCard
          label="Total liquido"
          value={formatMoney(totalNet, currency)}
          sub={`Bruto: ${formatMoney(totalGross, currency)} · Hold: ${formatMoney(totalHold, currency)}`}
        />
      </div>

      <Card padding={0}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Periodo</Th>
              <Th>Vencimento</Th>
              <Th align="center">Lancamentos</Th>
              <Th align="right">Bruto</Th>
              <Th align="right">Holdback</Th>
              <Th align="right">Liquido</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td>
              </tr>
            ) : groups.map((g) => {
              const status =
                g.lines.length === 0
                  ? "Sem atividades"
                  : g.paidNet >= g.net && g.net > 0
                  ? "Pago"
                  : g.overdue
                  ? "Vencido"
                  : "A vencer";
              const tone =
                status === "Pago" ? "var(--color-success)"
                : status === "Vencido" ? "var(--color-danger)"
                : status === "A vencer" ? "var(--color-warning)"
                : "var(--color-muted)";
              return (
                <tr key={g.period.index}>
                  <Td mono>#{g.period.index}</Td>
                  <Td mono>
                    {formatDate(g.period.start)} → {formatDate(g.period.end)}
                  </Td>
                  <Td mono bold>{formatDate(g.period.dueDate)}</Td>
                  <Td align="center" mono>{g.lines.length}</Td>
                  <Td align="right" mono>{formatMoney(g.gross, currency)}</Td>
                  <Td align="right" mono>{formatMoney(g.hold, currency)}</Td>
                  <Td align="right" mono bold>{formatMoney(g.net, currency)}</Td>
                  <Td>
                    <span style={{ color: tone, fontWeight: 600, fontSize: 12 }}>{status}</span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
