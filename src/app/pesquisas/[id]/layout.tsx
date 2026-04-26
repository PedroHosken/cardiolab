import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StudyTabs } from "@/components/StudyTabs";
import { StatusPill } from "@/components/StatusPill";
import Link from "next/link";

export default async function StudyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const study = await prisma.study.findUnique({
    where: { id },
    include: { sponsor: true, cro: true },
  });
  if (!study) notFound();

  const isPlanning = study.status === "PLANNING";

  return (
    <>
      <div
        style={{
          marginBottom: 14,
          paddingBottom: 12,
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Link href="/pesquisas" style={{ fontSize: 12, color: "var(--color-muted)" }}>
            Pesquisas
          </Link>
          <span style={{ color: "var(--color-muted)", fontSize: 12 }}>/</span>
          <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, fontSize: 13 }}>
            {study.protocolNumber}
          </span>
          <StatusPill status={study.status} />
          {isPlanning ? (
            <Link
              href={`/pesquisas/${study.id}/configurar`}
              style={{
                marginLeft: "auto",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-primary)",
                background: "#ecfeff",
                padding: "4px 10px",
                borderRadius: 6,
              }}
            >
              Continuar configuracao
            </Link>
          ) : null}
        </div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          {study.shortTitle ?? study.title}
        </h1>
        <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>
          {study.sponsor.name}
          {study.cro ? ` · CRO pagadora: ${study.cro.name}` : ""}
          {study.phase ? ` · Fase ${study.phase}` : ""}
        </div>
      </div>
      <StudyTabs studyId={study.id} />
      {children}
    </>
  );
}
