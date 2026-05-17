import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, StatCard, Th, Td } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { formatDate, formatMoney } from "@/lib/format";
import {
  buildPaymentPeriods,
  paymentFrequencyLabel,
  upcomingPeriod,
  type PaymentFrequency,
} from "@/lib/payment-frequency";

export default async function StudyOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const study = await prisma.study.findUnique({
    where: { id },
    include: {
      sponsor: true,
      cro: true,
      contractVersions: {
        orderBy: { effectiveDate: "desc" },
        include: { _count: { select: { budgetItems: true } } },
      },
      visitTemplates: { orderBy: { orderIndex: "asc" } },
      _count: { select: { subjects: true, batches: true } },
    },
  });
  if (!study) notFound();

  const activeContract =
    study.contractVersions.find((c) => c.isActive) ?? study.contractVersions[0];

  const lines = await prisma.billableLine.findMany({
    where: {
      OR: [
        { subject: { studyId: study.id } },
        { batch: { studyId: study.id } },
      ],
    },
  });

  const totalGross = lines.reduce((s, l) => s + l.grossAmount, 0);
  const totalNet = lines.reduce((s, l) => s + l.netAmount, 0);
  const totalHold = lines.reduce((s, l) => s + l.holdbackAmount, 0);
  const totalPaid = lines
    .filter((l) => l.status === "PAID")
    .reduce((s, l) => s + l.netAmount, 0);
  const totalPending = lines
    .filter((l) => ["READY", "IN_BATCH", "INVOICED"].includes(l.status))
    .reduce((s, l) => s + l.netAmount, 0);

  // Alerta de ciclo de pagamento vencido
  const today = new Date();
  let cycleAlert: null | {
    overdue: boolean;
    dueDate: Date;
    label: string;
    periodIndex: number;
  } = null;
  if (
    activeContract?.paymentFrequency &&
    activeContract.paymentStartDate
  ) {
    const horizon = new Date(today);
    horizon.setMonth(horizon.getMonth() + 6);
    const periods = buildPaymentPeriods(
      activeContract.paymentStartDate,
      activeContract.paymentFrequency as PaymentFrequency,
      horizon
    );
    const overdue = periods.find((p) => p.dueDate <= today);
    if (overdue) {
      cycleAlert = { overdue: true, dueDate: overdue.dueDate, label: paymentFrequencyLabel(activeContract.paymentFrequency), periodIndex: overdue.index };
    } else {
      const next = upcomingPeriod(activeContract.paymentStartDate, activeContract.paymentFrequency as PaymentFrequency, today);
      if (next) cycleAlert = { overdue: false, dueDate: next.dueDate, label: paymentFrequencyLabel(activeContract.paymentFrequency), periodIndex: next.index };
    }
  }

  return (
    <>
      {cycleAlert ? (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            borderRadius: 8,
            border: `1px solid ${cycleAlert.overdue ? "#fecaca" : "#bae6fd"}`,
            background: cycleAlert.overdue ? "#fef2f2" : "#f0f9ff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 13 }}>
            <strong style={{ color: cycleAlert.overdue ? "var(--color-danger)" : "var(--color-primary)" }}>
              {cycleAlert.overdue ? "Periodo de pagamento vencido" : "Proximo ciclo de pagamento"}
            </strong>
            {" — "}
            Periodo #{cycleAlert.periodIndex} ({cycleAlert.label}){" "}
            {cycleAlert.overdue ? "venceu em" : "vence em"}{" "}
            <strong>{formatDate(cycleAlert.dueDate)}</strong>.
          </div>
          <Link
            href={`/pesquisas/${study.id}/financeiro`}
            style={{
              padding: "8px 14px",
              background: cycleAlert.overdue ? "var(--color-danger)" : "var(--color-primary)",
              color: "white",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Listar procedimentos a pagar →
          </Link>
        </div>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard
          label="Pacientes"
          value={String(study._count.subjects)}
          sub={`${study._count.batches} lotes emitidos`}
          tone="primary"
        />
        <StatCard
          label="Faturado bruto"
          value={formatMoney(totalGross, study.defaultCurrency)}
          sub={`Holdback: ${formatMoney(totalHold, study.defaultCurrency)}`}
        />
        <StatCard
          label="A receber"
          value={formatMoney(totalPending, study.defaultCurrency)}
          sub={`Liquido total: ${formatMoney(totalNet, study.defaultCurrency)}`}
          tone="warning"
        />
        <StatCard
          label="Recebido"
          value={formatMoney(totalPaid, study.defaultCurrency)}
          tone="success"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
        <Card>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase" }}>
            Identificacao
          </h3>
          <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.7 }}>
            <div><strong>Protocolo:</strong> <span style={{ fontFamily: "ui-monospace, monospace" }}>{study.protocolNumber}</span></div>
            <div><strong>Patrocinador:</strong> {study.sponsor?.name ?? "-"}</div>
            {study.cro ? <div><strong>CRO pagadora:</strong> {study.cro.name}</div> : null}
            <div><strong>Fase:</strong> {study.phase ?? "-"}</div>
            <div><strong>Area:</strong> {study.therapeuticArea ?? "-"}</div>
            <div><strong>Moeda padrao:</strong> {study.defaultCurrency}</div>
          </div>
        </Card>
        <Card>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase" }}>
            Contrato vigente
          </h3>
          {activeContract ? (
            <>
              <div style={{ marginTop: 10, fontWeight: 600 }}>{activeContract.versionLabel}</div>
              <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
                Vigencia: {formatDate(activeContract.effectiveDate)}
              </div>
              <div style={{ display: "flex", gap: 18, marginTop: 12, fontSize: 12 }}>
                <div>Moeda: <strong>{activeContract.currency}</strong></div>
                <div>Overhead: <strong>{activeContract.overheadPercent}%</strong></div>
                <div>Holdback: <strong>{activeContract.holdbackPercent}%</strong></div>
                <div>Itens: <strong>{activeContract._count.budgetItems}</strong></div>
              </div>
              <p style={{ marginTop: 12, fontSize: 12, color: "var(--color-muted)" }}>
                {activeContract.paymentTerms}
              </p>
            </>
          ) : (
            <div>Sem contrato cadastrado.</div>
          )}
        </Card>
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 600, margin: "24px 0 10px" }}>
        Versoes do contrato
      </h2>
      <Card padding={0}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <Th>Versao</Th>
              <Th>Vigencia</Th>
              <Th align="center">Moeda</Th>
              <Th align="center">Overhead</Th>
              <Th align="center">Holdback</Th>
              <Th align="center">Itens</Th>
              <Th>Ativa?</Th>
            </tr>
          </thead>
          <tbody>
            {study.contractVersions.length === 0 ? (
              <tr>
                <Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td>
              </tr>
            ) : study.contractVersions.map((c) => (
              <tr key={c.id}>
                <Td bold>{c.versionLabel}</Td>
                <Td>{formatDate(c.effectiveDate)}</Td>
                <Td align="center" mono>{c.currency}</Td>
                <Td align="center" mono>{c.overheadPercent}%</Td>
                <Td align="center" mono>{c.holdbackPercent}%</Td>
                <Td align="center" mono>{c._count.budgetItems}</Td>
                <Td>{c.isActive ? <StatusPill status="ACTIVE" /> : <StatusPill status="CLOSED" />}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {study.visitTemplates.length > 0 ? (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: "24px 0 10px" }}>
            Cronograma de visitas
          </h2>
          <Card padding={0}>
            <table style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <Th>Codigo</Th>
                  <Th>Visita</Th>
                  <Th align="center">Semana</Th>
                  <Th align="center">Tipo</Th>
                </tr>
              </thead>
              <tbody>
                {study.visitTemplates.map((v) => (
                  <tr key={v.id}>
                    <Td bold mono>{v.code}</Td>
                    <Td>{v.name}</Td>
                    <Td align="center" mono>{v.weekOffset ?? "-"}</Td>
                    <Td align="center">
                      {v.isPhone ? "Telefone" : v.isVirtual ? "Virtual" : v.isHome ? "Domiciliar" : "Presencial"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      ) : null}
    </>
  );
}
