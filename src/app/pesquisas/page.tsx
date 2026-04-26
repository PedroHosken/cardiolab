import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Card, Table, Th, Td } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";

export default async function PesquisasPage() {
  const studies = await prisma.study.findMany({
    include: {
      sponsor: true,
      cro: true,
      _count: {
        select: { subjects: true, contractVersions: true, batches: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Pesquisas"
        description="Lista de estudos clinicos cadastrados"
      />
      <Card padding={0}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <Th>Protocolo</Th>
              <Th>Estudo</Th>
              <Th>Fase</Th>
              <Th>Patrocinador / CRO</Th>
              <Th align="center">Pacientes</Th>
              <Th align="center">Versoes</Th>
              <Th align="center">Lotes</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {studies.map((s) => (
              <tr key={s.id}>
                <Td bold mono>
                  <Link href={`/pesquisas/${s.id}`} style={{ color: "var(--color-primary)" }}>
                    {s.protocolNumber}
                  </Link>
                </Td>
                <Td>
                  <div style={{ fontWeight: 600 }}>{s.shortTitle ?? "-"}</div>
                  <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>
                    {s.therapeuticArea}
                  </div>
                </Td>
                <Td>{s.phase ?? "-"}</Td>
                <Td>
                  <div>{s.sponsor.name}</div>
                  {s.cro ? (
                    <div style={{ fontSize: 11, color: "var(--color-muted)" }}>CRO: {s.cro.name}</div>
                  ) : null}
                </Td>
                <Td align="center" mono>{s._count.subjects}</Td>
                <Td align="center" mono>{s._count.contractVersions}</Td>
                <Td align="center" mono>{s._count.batches}</Td>
                <Td><StatusPill status={s.status} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
