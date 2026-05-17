import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, StatCard, Th, Td } from "@/components/Card";
import { FinanceiroTabs } from "@/components/FinanceiroTabs";
import { formatDate, formatMoney } from "@/lib/format";

export default async function PassThroughPage({
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
      budgetItem: {
        contractVersion: { studyId: id },
        billingMode: "SITE_PASS_THROUGH",
      },
    },
    include: {
      subject: true,
      subjectVisit: { include: { visitTemplate: true } },
      budgetItem: true,
    },
    orderBy: [{ subjectId: "asc" }, { occurredAt: "asc" }],
  });

  type Subj = NonNullable<(typeof lines)[number]["subject"]>;
  type Visit = NonNullable<(typeof lines)[number]["subjectVisit"]>;
  type Group = {
    subject: Subj;
    visits: Map<string, { visit: Visit; lines: typeof lines }>;
  };
  const bySubject = new Map<string, Group>();

  for (const l of lines) {
    if (!l.subject) continue;
    const g =
      bySubject.get(l.subject.id) ??
      ({ subject: l.subject, visits: new Map() } as Group);
    if (l.subjectVisit) {
      const k = l.subjectVisit.id;
      const v = g.visits.get(k) ?? { visit: l.subjectVisit, lines: [] as typeof lines };
      v.lines.push(l);
      g.visits.set(k, v);
    }
    bySubject.set(l.subject.id, g);
  }

  const totalGross = lines.reduce((s, l) => s + l.grossAmount, 0);
  const totalHold = lines.reduce((s, l) => s + l.holdbackAmount, 0);
  const totalNet = lines.reduce((s, l) => s + l.netAmount, 0);

  return (
    <>
      <FinanceiroTabs studyId={id} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard label="Lancamentos" value={String(lines.length)} tone="primary" />
        <StatCard label="Bruto" value={formatMoney(totalGross, contract?.currency)} />
        <StatCard
          label="Holdback"
          value={formatMoney(totalHold, contract?.currency)}
          tone="warning"
        />
        <StatCard
          label="Liquido (proforma)"
          value={formatMoney(totalNet, contract?.currency)}
          tone="success"
        />
      </div>

      <p style={{ fontSize: 12, color: "var(--color-muted)", marginBottom: 12 }}>
        Itens marcados como <strong>pass-through</strong> (faturados via NF/proforma). Listagem por
        paciente / visita com data de realizacao + procedimentos pre-configurados. O holdback do
        contrato e aplicado sobre o valor final.
      </p>

      {bySubject.size === 0 ? (
        <Card>
          <div style={{ fontSize: 13, color: "var(--color-muted)", textAlign: "center", padding: 16 }}>
            Nenhum lancamento pass-through registrado ainda.
          </div>
        </Card>
      ) : (
        Array.from(bySubject.values()).map((g) => {
          const subjGross = Array.from(g.visits.values()).flatMap((v) => v.lines).reduce((s, l) => s + l.grossAmount, 0);
          const subjNet = Array.from(g.visits.values()).flatMap((v) => v.lines).reduce((s, l) => s + l.netAmount, 0);
          return (
            <Card key={g.subject.id} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <div>
                  <Link
                    href={`/pesquisas/${id}/pacientes/${g.subject.id}`}
                    style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--color-primary)", fontSize: 14 }}
                  >
                    {g.subject.subjectCode}
                  </Link>
                </div>
                <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
                  Bruto <strong>{formatMoney(subjGross, contract?.currency)}</strong> · Liquido <strong>{formatMoney(subjNet, contract?.currency)}</strong>
                </div>
              </div>

              {Array.from(g.visits.values()).map((v) => (
                <div
                  key={v.visit.id}
                  style={{
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    padding: 12,
                    marginTop: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ fontSize: 13 }}>
                      <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 600 }}>
                        {v.visit.visitTemplate.code}
                      </span>{" "}
                      · {v.visit.visitTemplate.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
                      Realizacao: <strong>{formatDate(v.visit.visitDate)}</strong>
                    </div>
                  </div>
                  <table style={{ width: "100%", fontSize: 12 }}>
                    <thead>
                      <tr>
                        <Th>Procedimento</Th>
                        <Th align="right">Bruto</Th>
                        <Th align="right">Holdback</Th>
                        <Th align="right">Liquido</Th>
                        <Th>NF/Proforma</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {v.lines.map((l) => (
                        <tr key={l.id}>
                          <Td>{l.budgetItem.name}</Td>
                          <Td align="right" mono>{formatMoney(l.grossAmount, l.currency)}</Td>
                          <Td align="right" mono>{formatMoney(l.holdbackAmount, l.currency)}</Td>
                          <Td align="right" mono bold>{formatMoney(l.netAmount, l.currency)}</Td>
                          <Td mono>{l.invoiceRef ?? "—"}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </Card>
          );
        })
      )}
    </>
  );
}
