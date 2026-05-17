import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, Th, Td } from "@/components/Card";
import { VisitStatusPill } from "@/components/VisitStatusPill";
import { VisitFilters } from "@/components/VisitFilters";
import { formatDate } from "@/lib/format";
import {
  asOptionalValuesRecord,
  parseOptionalFieldDefs,
  summarizeOptionalValues,
} from "@/lib/visit-optional";
import {
  matchesVisitFilter,
  parseVisitFilter,
  VISIT_FILTER_LABELS,
} from "@/lib/visit-filters";

export default async function VisitasStudyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    f?: string;
    subjectId?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) notFound();

  const activeFilter = parseVisitFilter(sp.f);
  const subjectId = sp.subjectId?.trim() || undefined;
  const rangeFrom = sp.from?.trim() || undefined;
  const rangeTo = sp.to?.trim() || undefined;

  const [allVisits, subjects] = await Promise.all([
    prisma.subjectVisit.findMany({
      where: { subject: { studyId: id } },
      include: { subject: true, visitTemplate: true },
      orderBy: [{ visitDate: "asc" }, { visitTemplate: { orderIndex: "asc" } }],
    }),
    prisma.subject.findMany({
      where: { studyId: id },
      orderBy: { subjectCode: "asc" },
      select: { id: true, subjectCode: true },
    }),
  ]);

  let visits = allVisits;
  if (activeFilter) {
    if (activeFilter === "patient" && !subjectId) {
      visits = [];
    } else if (activeFilter === "range" && (!rangeFrom || !rangeTo)) {
      visits = [];
    } else {
      visits = allVisits.filter((v) =>
        matchesVisitFilter(v, activeFilter, {
          subjectId,
          from: rangeFrom,
          to: rangeTo,
        })
      );
    }
  }

  const filterLabel = activeFilter ? VISIT_FILTER_LABELS[activeFilter] : null;

  return (
    <>
      <VisitFilters
        studyId={id}
        subjects={subjects}
        activeFilter={activeFilter}
        activeSubjectId={subjectId}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
      />

      {filterLabel ? (
        <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "0 0 10px" }}>
          {visits.length} visita(s) — {filterLabel}
        </p>
      ) : null}

      <Card padding={0}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <Th>Data</Th>
              <Th>Paciente</Th>
              <Th>Codigo</Th>
              <Th>Visita</Th>
              <Th>Opcionais</Th>
              <Th>Notas</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {visits.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: "var(--color-muted)",
                    borderBottom: "1px solid var(--color-border)",
                    fontSize: 13,
                  }}
                >
                  {activeFilter
                    ? "Nenhuma visita encontrada para este filtro."
                    : "Nenhuma visita cadastrada. Randomize pacientes para gerar o cronograma."}
                </td>
              </tr>
            ) : (
              visits.map((v) => {
                const defs = parseOptionalFieldDefs(v.visitTemplate.optionalFieldDefs);
                const optSumm = summarizeOptionalValues(defs, asOptionalValuesRecord(v.optionalValues));
                return (
                  <tr key={v.id}>
                    <Td mono>{formatDate(v.visitDate)}</Td>
                    <Td mono>
                      <Link
                        href={`/pesquisas/${id}/pacientes/${v.subject.id}`}
                        style={{ color: "var(--color-primary)" }}
                      >
                        {v.subject.subjectCode}
                      </Link>
                    </Td>
                    <Td bold mono>
                      <Link
                        href={`/pesquisas/${id}/pacientes/${v.subject.id}/visitas/${v.id}`}
                        style={{ color: "var(--color-primary)" }}
                      >
                        {v.visitTemplate.code}
                      </Link>
                    </Td>
                    <Td>{v.visitTemplate.name}</Td>
                    <Td style={{ fontSize: 12, color: "var(--color-muted)", maxWidth: 200 }}>
                      {optSumm || "—"}
                    </Td>
                    <Td style={{ fontSize: 12, maxWidth: 220, whiteSpace: "pre-wrap" }}>
                      {v.notes?.trim() ? v.notes : "—"}
                    </Td>
                    <Td>
                      <VisitStatusPill status={v.status} />
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
