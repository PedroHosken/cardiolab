import Link from "next/link";
import { Card, Th, Td } from "@/components/Card";
import { formatDate, formatMoney } from "@/lib/format";

export type ProformaLine = {
  id: string;
  occurredAt: Date;
  subjectCode: string | null;
  subjectId: string | null;
  visitDate: Date | null;
  procedureName: string;
  description: string | null;
  grossAmount: number;
  holdbackAmount: number;
  netAmount: number;
  currency: string;
};

export function ProformaTable({
  studyId,
  protocolNumber,
  lines,
  currency,
}: {
  studyId: string;
  protocolNumber: string;
  lines: ProformaLine[];
  currency: string;
}) {
  const totals = lines.reduce(
    (acc, l) => {
      acc.gross += l.grossAmount;
      acc.hold += l.holdbackAmount;
      acc.net += l.netAmount;
      return acc;
    },
    { gross: 0, hold: 0, net: 0 }
  );

  return (
    <Card padding={0}>
      <div
        style={{
          padding: "12px 14px",
          fontSize: 12,
          color: "var(--color-muted)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        Protocolo: <strong style={{ color: "var(--color-foreground)" }}>{protocolNumber}</strong>
      </div>
      <table style={{ width: "100%", fontSize: 13 }}>
        <thead>
          <tr>
            <Th>Paciente</Th>
            <Th>Data visita</Th>
            <Th>Procedimento</Th>
            <Th align="right">Valor total</Th>
            <Th align="right">Holdback</Th>
            <Th align="right">Valor a pagar</Th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "var(--color-muted)" }}>
                Nenhuma linha no proforma.
              </td>
            </tr>
          ) : (
            lines.map((l) => (
              <tr key={l.id}>
                <Td mono>
                  {l.subjectId && l.subjectCode ? (
                    <Link
                      href={`/pesquisas/${studyId}/pacientes/${l.subjectId}`}
                      style={{ color: "var(--color-primary)" }}
                    >
                      {l.subjectCode}
                    </Link>
                  ) : (
                    l.subjectCode ?? "—"
                  )}
                </Td>
                <Td mono>{formatDate(l.visitDate ?? l.occurredAt)}</Td>
                <Td>
                  <div style={{ fontWeight: 600 }}>{l.procedureName}</div>
                  {l.description ? (
                    <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{l.description}</div>
                  ) : null}
                </Td>
                <Td align="right" mono>
                  {formatMoney(l.grossAmount, l.currency)}
                </Td>
                <Td align="right" mono>
                  {formatMoney(l.holdbackAmount, l.currency)}
                </Td>
                <Td align="right" mono bold>
                  {formatMoney(l.netAmount, l.currency)}
                </Td>
              </tr>
            ))
          )}
        </tbody>
        {lines.length > 0 ? (
          <tfoot>
            <tr>
              <td
                colSpan={3}
                style={{
                  padding: "12px 14px",
                  textAlign: "right",
                  fontWeight: 700,
                  borderTop: "2px solid var(--color-border)",
                }}
              >
                Total a pagar
              </td>
              <td
                style={{
                  padding: "12px 14px",
                  textAlign: "right",
                  fontFamily: "ui-monospace, monospace",
                  fontWeight: 700,
                  borderTop: "2px solid var(--color-border)",
                }}
              >
                {formatMoney(totals.gross, currency)}
              </td>
              <td
                style={{
                  padding: "12px 14px",
                  textAlign: "right",
                  fontFamily: "ui-monospace, monospace",
                  fontWeight: 700,
                  borderTop: "2px solid var(--color-border)",
                }}
              >
                {formatMoney(totals.hold, currency)}
              </td>
              <td
                style={{
                  padding: "12px 14px",
                  textAlign: "right",
                  fontFamily: "ui-monospace, monospace",
                  fontWeight: 700,
                  color: "var(--color-primary)",
                  borderTop: "2px solid var(--color-border)",
                }}
              >
                {formatMoney(totals.net, currency)}
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </Card>
  );
}
