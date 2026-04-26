import Link from "next/link";
import { Plus } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, StatCard, Th, Td } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { formatDate, formatMoney } from "@/lib/format";

const SCREENING_GROUP = ["SCREENING"];
const ACTIVE_GROUP = ["RANDOMIZED", "ACTIVE"];
const CLOSED_GROUP = ["SCREEN_FAIL", "DISCONTINUED", "COMPLETED"];

function PatientsTable({
  rows,
  studyId,
  showOutcome,
}: {
  rows: Awaited<ReturnType<typeof loadSubjects>>;
  studyId: string;
  showOutcome?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <div style={{ fontSize: 13, color: "var(--color-muted)", textAlign: "center", padding: 12 }}>
          Nenhum paciente nesta etapa.
        </div>
      </Card>
    );
  }
  return (
    <Card padding={0}>
      <table style={{ width: "100%", fontSize: 13 }}>
        <thead>
          <tr>
            <Th>Codigo</Th>
            <Th>Status</Th>
            <Th>{showOutcome ? "Saida em" : "Triagem em"}</Th>
            <Th>Randomizacao</Th>
            <Th align="center">Visitas</Th>
            <Th align="center">Lancamentos</Th>
            <Th align="right">Faturado bruto</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const total = s.billableLines.reduce((sum, l) => sum + l.grossAmount, 0);
            const completedVisits = s.visits.filter((v) => v.status === "COMPLETED").length;
            return (
              <tr key={s.id}>
                <Td bold mono>
                  <Link
                    href={`/pesquisas/${studyId}/pacientes/${s.id}`}
                    style={{ color: "var(--color-primary)" }}
                  >
                    {s.subjectCode}
                  </Link>
                </Td>
                <Td>
                  <StatusPill status={s.status} />
                </Td>
                <Td>{showOutcome ? formatDate(s.exitedAt) : formatDate(s.enrolledAt)}</Td>
                <Td>{formatDate(s.randomizedAt)}</Td>
                <Td align="center" mono>
                  {completedVisits}/{s.visits.length}
                </Td>
                <Td align="center" mono>
                  {s.billableLines.length}
                </Td>
                <Td align="right" mono>
                  {formatMoney(total)}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

async function loadSubjects(studyId: string) {
  return prisma.subject.findMany({
    where: { studyId },
    include: { visits: true, billableLines: true },
    orderBy: { subjectCode: "asc" },
  });
}

export default async function PacientesStudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) notFound();

  const subjects = await loadSubjects(id);

  const screening = subjects.filter((s) => SCREENING_GROUP.includes(s.status));
  const active = subjects.filter((s) => ACTIVE_GROUP.includes(s.status));
  const closed = subjects.filter((s) => CLOSED_GROUP.includes(s.status));

  const totalRandomized = subjects.filter((s) =>
    [...ACTIVE_GROUP, "COMPLETED"].includes(s.status)
  ).length;
  const totalScreened = subjects.length - subjects.filter((s) => s.status === "DISCONTINUED").length;
  const screenFailRate =
    totalScreened > 0
      ? Math.round((subjects.filter((s) => s.status === "SCREEN_FAIL").length / totalScreened) * 100)
      : 0;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, flex: 1 }}>
          <StatCard label="Em triagem" value={String(screening.length)} tone="warning" />
          <StatCard
            label="Em estudo"
            value={String(active.length)}
            tone="primary"
            sub={`${totalRandomized} randomizados ate hoje`}
          />
          <StatCard
            label="Falhas de triagem"
            value={String(subjects.filter((s) => s.status === "SCREEN_FAIL").length)}
            sub={`Taxa: ${screenFailRate}%`}
          />
          <StatCard
            label="Concluidos"
            value={String(subjects.filter((s) => s.status === "COMPLETED").length)}
            tone="success"
          />
        </div>
        <Link
          href={`/pesquisas/${id}/pacientes/novo`}
          style={{
            marginLeft: 16,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 16px",
            background: "var(--color-primary)",
            color: "white",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
            alignSelf: "flex-start",
          }}
        >
          <Plus size={14} />
          Adicionar paciente
        </Link>
      </div>

      {study.status === "PLANNING" ? (
        <Card>
          <div style={{ color: "var(--color-danger)", fontWeight: 600, fontSize: 14 }}>
            Esta pesquisa esta em rascunho. Conclua a configuracao (Passo 6) antes de cadastrar pacientes.
          </div>
        </Card>
      ) : null}

      <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", margin: "24px 0 8px" }}>
        Em triagem ({screening.length})
      </h2>
      <PatientsTable rows={screening} studyId={id} />

      <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", margin: "24px 0 8px" }}>
        Em estudo ({active.length})
      </h2>
      <PatientsTable rows={active} studyId={id} />

      {closed.length > 0 ? (
        <>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", margin: "24px 0 8px" }}>
            Encerrados ({closed.length})
          </h2>
          <PatientsTable rows={closed} studyId={id} showOutcome />
        </>
      ) : null}
    </>
  );
}
