import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Card, Th, Td } from "@/components/Card";
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
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const drafts = studies.filter((s) => s.status === "PLANNING");
  const live = studies.filter((s) => s.status !== "PLANNING");

  return (
    <>
      <PageHeader
        title="Pesquisas"
        description="Cada pesquisa e um workspace proprio com seu contrato, cronograma, pacientes e faturamento."
        actions={
          <Link
            href="/pesquisas/nova"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 16px",
              background: "var(--color-primary)",
              color: "white",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Plus size={14} />
            Nova pesquisa
          </Link>
        }
      />

      {drafts.length > 0 ? (
        <>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", margin: "8px 0 8px" }}>
            Rascunhos ({drafts.length})
          </h2>
          <Card padding={0}>
            <table style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <Th>Protocolo</Th>
                  <Th>Estudo</Th>
                  <Th>Patrocinador</Th>
                  <Th align="center">Passo atual</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((s) => (
                  <tr key={s.id}>
                    <Td bold mono>
                      <Link href={`/pesquisas/${s.id}`} style={{ color: "var(--color-primary)" }}>
                        {s.protocolNumber}
                      </Link>
                    </Td>
                    <Td>{s.shortTitle ?? s.title}</Td>
                    <Td>{s.sponsor?.name ?? "-"}</Td>
                    <Td align="center" mono>Passo {s.wizardStep} de 6</Td>
                    <Td align="right">
                      <Link
                        href={`/pesquisas/${s.id}/configurar`}
                        style={{
                          padding: "5px 12px",
                          background: "var(--color-primary)",
                          color: "white",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Continuar configuracao →
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      ) : null}

      <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", margin: "20px 0 8px" }}>
        Em operacao ({live.length})
      </h2>
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
            {live.length === 0 ? (
              <tr>
                <Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td>
              </tr>
            ) : live.map((s) => (
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
                  <div>{s.sponsor?.name ?? "-"}</div>
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
