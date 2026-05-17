import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, StatCard, Th, Td } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { ProformaTable } from "@/components/ProformaTable";
import { BatchLineActions } from "@/components/BatchLineActions";
import { formatDate, formatMoney, kindLabel, statusLabel } from "@/lib/format";
import { billingModeLabel } from "@/lib/billing-mode";
import { toProformaLines } from "@/lib/proforma-lines";
import { buildProformaExportPayload } from "@/lib/build-proforma-export";
import { ProformaExportToolbar } from "@/components/ProformaExportToolbar";
import { markBatchPaid, submitBatch } from "../actions";

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
          subjectVisit: { include: { visitTemplate: true } },
        },
        orderBy: { occurredAt: "asc" },
      },
    },
  });
  if (!batch) notFound();

  const activeLines = batch.billableLines.filter(
    (l) => !["GLOSSED", "WRITTEN_OFF"].includes(l.status)
  );
  const proformaLines = toProformaLines(activeLines);
  const exportPayload = buildProformaExportPayload({
    batchNumber: batch.batchNumber,
    studyTitle: batch.study.shortTitle ?? batch.study.title,
    protocolNumber: batch.study.protocolNumber,
    referenceMonth: batch.referenceMonth,
    currency: batch.currency,
    billingMode: batch.billingMode,
    batchStatus: batch.status,
    submittedAt: batch.submittedAt,
    proformaNotes: batch.proformaNotes,
    lines: proformaLines,
  });
  const isDraft = batch.status === "DRAFT";
  const isSubmitted = batch.status === "SUBMITTED";
  const canPay = ["SUBMITTED", "PARTIALLY_PAID", "DISPUTED"].includes(batch.status);

  return (
    <>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Link href={`/pesquisas/${id}/lotes`} style={{ fontSize: 12, color: "var(--color-muted)" }}>
          ← Lotes
        </Link>
        <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, fontSize: 16 }}>
          {batch.batchNumber}
        </span>
        <StatusPill status={batch.status} />
        <span className="pill pill-neutral" style={{ fontSize: 11 }}>
          {billingModeLabel(batch.billingMode)}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard label="Linhas ativas" value={String(activeLines.length)} />
        <StatCard label="Bruto" value={formatMoney(batch.totalGross, batch.currency)} />
        <StatCard label="Holdback" value={formatMoney(batch.totalHoldback, batch.currency)} tone="warning" />
        <StatCard
          label="Liquido"
          value={formatMoney(batch.totalNet, batch.currency)}
          tone={batch.status === "PAID" ? "success" : "primary"}
          sub={batch.paidDate ? `Pago em ${formatDate(batch.paidDate)}` : undefined}
        />
      </div>

      <Card style={{ marginTop: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, fontSize: 13 }}>
          <div>
            <strong>Pesquisa:</strong> {batch.study.shortTitle ?? batch.study.title}
          </div>
          <div>
            <strong>Protocolo:</strong> {batch.study.protocolNumber}
          </div>
          <div>
            <strong>Mes ref.:</strong> {batch.referenceMonth ?? "-"}
          </div>
          <div>
            <strong>Enviado em:</strong> {formatDate(batch.submittedAt)}
          </div>
          <div>
            <strong>NF / ref.:</strong> {batch.invoiceNumber ?? "-"}
          </div>
        </div>
        {batch.proformaNotes ? (
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--color-muted)" }}>
            <strong>Obs. proforma:</strong> {batch.proformaNotes}
          </p>
        ) : null}
      </Card>

      {isDraft ? (
        <Card style={{ marginTop: 16 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600 }}>
            {batch.billingMode === "SPONSOR_EDC"
              ? "Confirmar faturamento (incluir no invoice ao patrocinador)"
              : "Enviar proforma ao patrocinador"}
          </h3>
          <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "0 0 12px" }}>
            Revise o proforma abaixo. Ao confirmar, o lote passa para{" "}
            <strong>em processo de pagamento</strong> e cada linha fica como{" "}
            <strong>{statusLabel("INVOICED")}</strong>.
          </p>
          <form action={submitBatch}>
            <input type="hidden" name="batchId" value={batch.id} />
            <input type="hidden" name="studyId" value={id} />
            <label style={{ display: "block", fontSize: 11, color: "var(--color-muted)", marginBottom: 12 }}>
              Observacoes do envio (opcional)
              <textarea
                name="proformaNotes"
                rows={2}
                placeholder="Ex.: Proforma ref. ciclo maio/2026; aguardando PO do patrocinador."
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 4,
                  padding: "8px 10px",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              />
            </label>
            <button
              type="submit"
              style={{
                padding: "9px 16px",
                background: "var(--color-primary)",
                color: "white",
                border: 0,
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Confirmar envio — aguardar pagamento
            </button>
          </form>
        </Card>
      ) : null}

      {canPay ? (
        <form action={markBatchPaid} style={{ marginTop: 16 }}>
          <input type="hidden" name="batchId" value={batch.id} />
          <input type="hidden" name="studyId" value={id} />
          <button
            type="submit"
            style={{
              padding: "9px 16px",
              background: "var(--color-success)",
              color: "white",
              border: 0,
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Marcar lote como pago
          </button>
          <span style={{ marginLeft: 12, fontSize: 12, color: "var(--color-muted)" }}>
            Todas as linhas faturadas deste lote passam para {statusLabel("PAID")}.
          </span>
        </form>
      ) : null}

      {isSubmitted ? (
        <p style={{ marginTop: 12, fontSize: 12, color: "#92400e", background: "#fffbeb", padding: 10, borderRadius: 8 }}>
          Lote em processo de pagamento desde {formatDate(batch.submittedAt)}. Glosas ou suspensoes
          podem ser registradas por linha; linhas glosadas saem do total do lote.
        </p>
      ) : null}

      <h2 style={{ fontSize: 14, fontWeight: 600, margin: "24px 0 10px" }}>Proforma invoice</h2>
      {proformaLines.length > 0 ? <ProformaExportToolbar data={exportPayload} /> : null}
      <ProformaTable
        studyId={id}
        protocolNumber={batch.study.protocolNumber}
        lines={proformaLines}
        currency={batch.currency}
      />

      <h2 style={{ fontSize: 14, fontWeight: 600, margin: "24px 0 10px" }}>
        Detalhe das linhas ({batch.billableLines.length})
      </h2>
      <Card padding={0}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <Th>Data</Th>
              <Th>Paciente</Th>
              <Th>Item</Th>
              <Th align="center">Tipo</Th>
              <Th align="right">Liquido</Th>
              <Th>Status</Th>
              <Th>Acoes</Th>
            </tr>
          </thead>
          <tbody>
            {batch.billableLines.map((l) => (
              <tr key={l.id}>
                <Td mono>{formatDate(l.occurredAt)}</Td>
                <Td mono>
                  {l.subject ? (
                    <Link href={`/pesquisas/${id}/pacientes/${l.subject.id}`} style={{ color: "var(--color-primary)" }}>
                      {l.subject.subjectCode}
                    </Link>
                  ) : (
                    "-"
                  )}
                </Td>
                <Td>
                  <div style={{ fontWeight: 600 }}>{l.budgetItem.name}</div>
                  {l.description ? (
                    <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{l.description}</div>
                  ) : null}
                  {l.statusReason ? (
                    <div style={{ fontSize: 11, color: "var(--color-danger)" }}>{l.statusReason}</div>
                  ) : null}
                </Td>
                <Td align="center">
                  <span className="pill pill-info">{kindLabel(l.budgetItem.kind)}</span>
                </Td>
                <Td align="right" mono bold>
                  {formatMoney(l.netAmount, l.currency)}
                </Td>
                <Td>
                  <StatusPill status={l.status} />
                </Td>
                <Td>
                  <BatchLineActions
                    lineId={l.id}
                    studyId={id}
                    batchId={batch.id}
                    lineStatus={l.status}
                    batchStatus={batch.status}
                    canEdit={!["PAID", "GLOSSED", "WRITTEN_OFF"].includes(l.status)}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
