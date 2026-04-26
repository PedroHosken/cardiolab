import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, StatCard, Th, Td } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { formatDate, formatMoney, kindLabel } from "@/lib/format";
import {
  randomizeSubject,
  markScreenFailure,
  discontinueSubject,
  completeSubject,
} from "../actions";
import { SubjectVisitForm } from "@/components/SubjectVisitForm";

export default async function SubjectDetail({
  params,
}: {
  params: Promise<{ id: string; subjectId: string }>;
}) {
  const { id, subjectId } = await params;
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, studyId: id },
    include: {
      visits: {
        include: { visitTemplate: true },
        orderBy: { visitTemplate: { orderIndex: "asc" } },
      },
      billableLines: {
        include: { budgetItem: true },
        orderBy: { occurredAt: "desc" },
      },
    },
  });
  if (!subject) notFound();

  const total = subject.billableLines.reduce((s, l) => s + l.grossAmount, 0);
  const totalNet = subject.billableLines.reduce((s, l) => s + l.netAmount, 0);
  const totalPaid = subject.billableLines
    .filter((l) => l.status === "PAID")
    .reduce((s, l) => s + l.netAmount, 0);

  const today = new Date().toISOString().slice(0, 10);
  const isScreening = subject.status === "SCREENING";
  const isActive = ["RANDOMIZED", "ACTIVE"].includes(subject.status);

  return (
    <>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Link
          href={`/pesquisas/${id}/pacientes`}
          style={{ fontSize: 12, color: "var(--color-muted)" }}
        >
          ← Pacientes
        </Link>
        <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, fontSize: 16 }}>
          {subject.subjectCode}
        </span>
        <StatusPill status={subject.status} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard
          label="Visitas concluidas"
          value={String(subject.visits.filter((v) => v.status === "COMPLETED").length)}
          sub={`${subject.visits.length} programadas`}
          tone="primary"
        />
        <StatCard label="Faturado bruto" value={formatMoney(total)} sub={`Liquido: ${formatMoney(totalNet)}`} />
        <StatCard label="Recebido" value={formatMoney(totalPaid)} tone="success" />
        <StatCard
          label="Triagem em"
          value={formatDate(subject.enrolledAt)}
          sub={`Random: ${formatDate(subject.randomizedAt)}`}
        />
      </div>

      {/* Acoes contextuais */}
      {isScreening ? (
        <Card>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", marginBottom: 12 }}>
            Desfecho da triagem
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <form
              action={randomizeSubject}
              style={{
                padding: 14,
                border: "1px solid var(--color-success)",
                borderRadius: 8,
                background: "#f0fdf4",
              }}
            >
              <input type="hidden" name="studyId" value={id} />
              <input type="hidden" name="subjectId" value={subject.id} />
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Randomizar paciente</div>
              <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 10 }}>
                Programa todas as visitas do protocolo e ativa o paciente para acompanhamento.
              </div>
              <label style={{ fontSize: 11, color: "var(--color-muted)" }}>Data da randomizacao</label>
              <input
                type="date"
                name="randomizationDate"
                defaultValue={today}
                style={{
                  width: "100%",
                  marginTop: 4,
                  marginBottom: 10,
                  padding: "7px 10px",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              />
              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "9px 14px",
                  background: "var(--color-success)",
                  color: "white",
                  border: 0,
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Randomizar
              </button>
            </form>

            <form
              action={markScreenFailure}
              style={{
                padding: 14,
                border: "1px solid #fecaca",
                borderRadius: 8,
                background: "#fef2f2",
              }}
            >
              <input type="hidden" name="studyId" value={id} />
              <input type="hidden" name="subjectId" value={subject.id} />
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Falha de triagem</div>
              <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 10 }}>
                Encerra triagem. Se houver item SCREEN_FAIL no orcamento, gera lancamento automaticamente.
              </div>
              <label style={{ fontSize: 11, color: "var(--color-muted)" }}>Data</label>
              <input
                type="date"
                name="failureDate"
                defaultValue={today}
                style={{
                  width: "100%",
                  marginTop: 4,
                  marginBottom: 8,
                  padding: "7px 10px",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              />
              <label style={{ fontSize: 11, color: "var(--color-muted)" }}>Motivo</label>
              <input
                name="reason"
                placeholder="Ex.: criterio de exclusao - clearance < 30"
                style={{
                  width: "100%",
                  marginTop: 4,
                  marginBottom: 10,
                  padding: "7px 10px",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              />
              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "9px 14px",
                  background: "var(--color-danger)",
                  color: "white",
                  border: 0,
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Marcar falha de triagem
              </button>
            </form>
          </div>
        </Card>
      ) : null}

      {isActive ? (
        <Card>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", marginBottom: 12 }}>
            Encerramento do paciente
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <form
              action={completeSubject}
              style={{
                padding: 14,
                border: "1px solid var(--color-success)",
                borderRadius: 8,
                background: "#f0fdf4",
              }}
            >
              <input type="hidden" name="studyId" value={id} />
              <input type="hidden" name="subjectId" value={subject.id} />
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Concluir pesquisa</div>
              <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 10 }}>
                Use quando o paciente cumpriu todas as visitas do protocolo.
              </div>
              <label style={{ fontSize: 11, color: "var(--color-muted)" }}>Data de conclusao</label>
              <input
                type="date"
                name="exitDate"
                defaultValue={today}
                style={{
                  width: "100%",
                  marginTop: 4,
                  marginBottom: 10,
                  padding: "7px 10px",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              />
              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "9px 14px",
                  background: "var(--color-success)",
                  color: "white",
                  border: 0,
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Marcar como concluido
              </button>
            </form>

            <form
              action={discontinueSubject}
              style={{
                padding: 14,
                border: "1px solid #fecaca",
                borderRadius: 8,
                background: "#fef2f2",
              }}
            >
              <input type="hidden" name="studyId" value={id} />
              <input type="hidden" name="subjectId" value={subject.id} />
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Descontinuar</div>
              <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 10 }}>
                Encerra a participacao antes do previsto. Visitas pendentes sao canceladas.
              </div>
              <label style={{ fontSize: 11, color: "var(--color-muted)" }}>Data de saida</label>
              <input
                type="date"
                name="exitDate"
                defaultValue={today}
                style={{
                  width: "100%",
                  marginTop: 4,
                  marginBottom: 8,
                  padding: "7px 10px",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              />
              <label style={{ fontSize: 11, color: "var(--color-muted)" }}>Motivo</label>
              <input
                name="reason"
                placeholder="Ex.: AE serio, retirada de consentimento"
                style={{
                  width: "100%",
                  marginTop: 4,
                  marginBottom: 10,
                  padding: "7px 10px",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              />
              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "9px 14px",
                  background: "var(--color-danger)",
                  color: "white",
                  border: 0,
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Descontinuar
              </button>
            </form>
          </div>
        </Card>
      ) : null}

      {subject.notes ? (
        <Card>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", marginBottom: 8 }}>
            Anotacoes
          </h3>
          <pre
            style={{
              fontFamily: "inherit",
              fontSize: 13,
              whiteSpace: "pre-wrap",
              margin: 0,
              color: "var(--color-foreground)",
            }}
          >
            {subject.notes}
          </pre>
        </Card>
      ) : null}

      {subject.visits.length > 0 ? (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: "24px 0 10px" }}>
            Visitas do paciente
          </h2>
          <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "0 0 14px" }}>
            Registre data, se a visita foi realizada, notas e os campos opcionais definidos no cronograma
            da pesquisa (Passo 4).
          </p>
          <div style={{ display: "grid", gap: 14 }}>
            {subject.visits.map((v) => (
              <SubjectVisitForm key={v.id} visit={v} studyId={id} subjectId={subject.id} />
            ))}
          </div>
        </>
      ) : null}

      {subject.billableLines.length > 0 ? (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: "24px 0 10px" }}>
            Lancamentos faturaveis
          </h2>
          <Card padding={0}>
            <table style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <Th>Data</Th>
                  <Th>Item</Th>
                  <Th align="center">Tipo</Th>
                  <Th align="right">Bruto</Th>
                  <Th align="right">Holdback</Th>
                  <Th align="right">Liquido</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {subject.billableLines.map((l) => (
                  <tr key={l.id}>
                    <Td mono>{formatDate(l.occurredAt)}</Td>
                    <Td>
                      <div style={{ fontWeight: 600 }}>{l.budgetItem.name}</div>
                      {l.description ? <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{l.description}</div> : null}
                    </Td>
                    <Td align="center"><span className="pill pill-info">{kindLabel(l.budgetItem.kind)}</span></Td>
                    <Td align="right" mono>{formatMoney(l.grossAmount)}</Td>
                    <Td align="right" mono>{formatMoney(l.holdbackAmount)}</Td>
                    <Td align="right" mono bold>{formatMoney(l.netAmount)}</Td>
                    <Td><StatusPill status={l.status} /></Td>
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
