import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, StatCard, Th, Td } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { formatDate, formatMoney } from "@/lib/format";
import { billingModeLabel } from "@/lib/billing-mode";
import { generatePendingBatch } from "./actions";

export default async function LotesStudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) notFound();

  const baseReadyWhere = {
    status: "READY" as const,
    batchId: null,
    OR: [{ subject: { studyId: id } }, { subjectId: null }],
  };

  const [batches, pendingEdc, pendingPt, inPayment] = await Promise.all([
    prisma.batch.findMany({
      where: { studyId: id },
      include: { _count: { select: { billableLines: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.billableLine.count({
      where: { ...baseReadyWhere, budgetItem: { billingMode: "SPONSOR_EDC" } },
    }),
    prisma.billableLine.count({
      where: { ...baseReadyWhere, budgetItem: { billingMode: "SITE_PASS_THROUGH" } },
    }),
    prisma.batch.count({
      where: { studyId: id, status: "SUBMITTED" },
    }),
  ]);

  const totalPaid = batches
    .filter((b) => b.status === "PAID")
    .reduce((s, b) => s + b.totalPaid, 0);

  const btnLink = (href: string, label: string, count: number) => (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        borderRadius: 8,
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--color-foreground)",
      }}
    >
      {label}
      <span
        style={{
          fontSize: 11,
          padding: "2px 8px",
          borderRadius: 10,
          background: count > 0 ? "#ecfeff" : "#f1f5f9",
          color: count > 0 ? "var(--color-primary)" : "var(--color-muted)",
        }}
      >
        {count}
      </span>
    </Link>
  );

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard label="Lotes" value={String(batches.length)} tone="primary" />
        <StatCard
          label="Aguardando pagamento"
          value={String(inPayment)}
          sub="Lotes enviados (SUBMITTED)"
          tone={inPayment > 0 ? "warning" : "default"}
        />
        <StatCard label="Recebido" value={formatMoney(totalPaid)} tone="success" />
        <StatCard
          label="Pendentes EDC + Pass-through"
          value={String(pendingEdc + pendingPt)}
          sub={`EDC: ${pendingEdc} · PT: ${pendingPt}`}
        />
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 600, margin: "24px 0 12px" }}>
        Montar lote de faturamento
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card>
          <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>
            1. Proforma do patrocinador (EDC)
          </h3>
          <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "0 0 14px" }}>
            O patrocinador informa o que pagara. Selecione os procedimentos que entrarao no seu
            invoice e marque como faturado. Linhas omitidas pelo patrocinador permanecem pendentes
            para um proximo ciclo ou podem ser glosadas.
          </p>
          {btnLink(`/pesquisas/${id}/lotes/novo?mode=SPONSOR_EDC`, "Selecionar pendentes EDC", pendingEdc)}
          <form action={generatePendingBatch} style={{ marginTop: 10 }}>
            <input type="hidden" name="studyId" value={id} />
            <input type="hidden" name="billingMode" value="SPONSOR_EDC" />
            <input
              type="hidden"
              name="referenceMonth"
              value={new Date().toISOString().slice(0, 7)}
            />
            <button
              type="submit"
              disabled={pendingEdc === 0}
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "var(--color-muted)",
                background: "none",
                border: "none",
                cursor: pendingEdc > 0 ? "pointer" : "not-allowed",
                textDecoration: "underline",
              }}
            >
              Ou incluir todos os {pendingEdc} pendentes de uma vez
            </button>
          </form>
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>
            2. Pass-through (centro gera proforma)
          </h3>
          <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "0 0 14px" }}>
            Voce monta o proforma com protocolo, paciente, visita e valores. Envie ao patrocinador;
            glosas e reenvios ficam rastreados no lote e no historico de auditoria.
          </p>
          {btnLink(
            `/pesquisas/${id}/lotes/novo?mode=SITE_PASS_THROUGH`,
            "Selecionar pendentes pass-through",
            pendingPt
          )}
          <form action={generatePendingBatch} style={{ marginTop: 10 }}>
            <input type="hidden" name="studyId" value={id} />
            <input type="hidden" name="billingMode" value="SITE_PASS_THROUGH" />
            <input
              type="hidden"
              name="referenceMonth"
              value={new Date().toISOString().slice(0, 7)}
            />
            <button
              type="submit"
              disabled={pendingPt === 0}
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "var(--color-muted)",
                background: "none",
                border: "none",
                cursor: pendingPt > 0 ? "pointer" : "not-allowed",
                textDecoration: "underline",
              }}
            >
              Ou incluir todos os {pendingPt} pendentes de uma vez
            </button>
          </form>
        </Card>
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 10px" }}>Historico de lotes</h2>
      <Card padding={0}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <Th>Numero</Th>
              <Th>Modalidade</Th>
              <Th>Status</Th>
              <Th>Mes ref.</Th>
              <Th align="center">Linhas</Th>
              <Th align="right">Liquido</Th>
              <Th>Enviado</Th>
              <Th>Pago em</Th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 20, textAlign: "center", color: "var(--color-muted)" }}>
                  Nenhum lote criado.
                </td>
              </tr>
            ) : (
              batches.map((b) => (
                <tr key={b.id}>
                  <Td bold mono>
                    <Link href={`/pesquisas/${id}/lotes/${b.id}`} style={{ color: "var(--color-primary)" }}>
                      {b.batchNumber}
                    </Link>
                  </Td>
                  <Td style={{ fontSize: 11 }}>{billingModeLabel(b.billingMode)}</Td>
                  <Td>
                    <StatusPill status={b.status} />
                  </Td>
                  <Td mono>{b.referenceMonth ?? "-"}</Td>
                  <Td align="center" mono>
                    {b._count.billableLines}
                  </Td>
                  <Td align="right" mono bold>
                    {formatMoney(b.totalNet, b.currency)}
                  </Td>
                  <Td>{formatDate(b.submittedAt)}</Td>
                  <Td>{formatDate(b.paidDate)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
