import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { CreateBatchSelector } from "@/components/CreateBatchSelector";
import { billingModeLabel, parseBillingMode } from "@/lib/billing-mode";

export default async function NovoLotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const billingMode = parseBillingMode(sp.mode);

  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) notFound();

  const lines = await prisma.billableLine.findMany({
    where: {
      status: "READY",
      batchId: null,
      budgetItem: { billingMode, contractVersion: { studyId: id, isActive: true } },
    },
    include: {
      budgetItem: true,
      subject: true,
    },
    orderBy: { occurredAt: "asc" },
  });

  const rows = lines.map((l) => ({
    id: l.id,
    occurredAt: l.occurredAt.toISOString(),
    subjectCode: l.subject?.subjectCode ?? null,
    procedureName: l.budgetItem.name,
    grossAmount: l.grossAmount,
    netAmount: l.netAmount,
    currency: l.currency,
    budgetItemId: l.budgetItemId,
  }));

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Link href={`/pesquisas/${id}/lotes`} style={{ fontSize: 12, color: "var(--color-muted)" }}>
          ← Lotes
        </Link>
        <h1 style={{ margin: "8px 0 0", fontSize: 18, fontWeight: 700 }}>
          Novo lote — {billingModeLabel(billingMode)}
        </h1>
      </div>

      <Card>
        {rows.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-muted)" }}>
            Nao ha lancamentos pendentes (READY) nesta modalidade. Registre visitas ou confira a
            classificacao dos itens no catalogo.
          </p>
        ) : (
          <CreateBatchSelector
            studyId={id}
            billingMode={billingMode}
            lines={rows}
            defaultMonth={new Date().toISOString().slice(0, 7)}
          />
        )}
      </Card>
    </>
  );
}
