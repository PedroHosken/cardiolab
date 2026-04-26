import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Card, StatCard, Th, Td } from "@/components/Card";
import { formatMoney, kindLabel, methodLabel } from "@/lib/format";

export default async function OrcamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ studyId?: string; kind?: string }>;
}) {
  const sp = await searchParams;

  const studies = await prisma.study.findMany({
    include: { contractVersions: { where: { isActive: true } } },
  });
  const studyId = sp.studyId ?? studies[0]?.id;
  const activeContract =
    studies.find((s) => s.id === studyId)?.contractVersions[0] ?? null;

  const items = activeContract
    ? await prisma.budgetItem.findMany({
        where: { contractVersionId: activeContract.id },
        include: { visitTemplate: true },
        orderBy: [{ kind: "asc" }, { name: "asc" }],
      })
    : [];

  const kinds = Array.from(new Set(items.map((i) => i.kind)));
  const filteredItems = sp.kind ? items.filter((i) => i.kind === sp.kind) : items;

  const totalContracted = items
    .filter((i) => i.method === "AMOUNT" || i.method === "QUANTITY")
    .reduce((s, i) => s + i.unitAmount * i.defaultQuantity, 0);

  const totalPerSubject = items
    .filter((i) => i.kind === "VISIT" && i.method === "PER_OCCURRENCE")
    .reduce((s, i) => s + i.unitAmount, 0);

  const passThroughCount = items.filter((i) => i.kind === "PASS_THROUGH").length;
  const crfCount = items.filter((i) => i.kind === "CRF_TRIGGERED").length;

  return (
    <>
      <PageHeader
        title="Catalogo de Itens Faturaveis"
        description="Visao do orcamento contratado por versao do contrato. Configuravel por estudo."
      />

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--color-muted)" }}>Pesquisa:</span>
        {studies.map((s) => (
          <a
            key={s.id}
            href={`/orcamento?studyId=${s.id}`}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              background: s.id === studyId ? "var(--color-primary)" : "var(--color-surface)",
              color: s.id === studyId ? "white" : "var(--color-foreground)",
              border: "1px solid var(--color-border)",
            }}
          >
            {s.protocolNumber}
          </a>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard
          label="Itens cadastrados"
          value={String(items.length)}
          sub={`${passThroughCount} pass-through · ${crfCount} CRF auto`}
          tone="primary"
        />
        <StatCard
          label="Total por participante"
          value={formatMoney(totalPerSubject, activeContract?.currency)}
          sub="Soma das visitas regulares (PER_OCCURRENCE)"
        />
        <StatCard
          label="Itens fixos contratados"
          value={formatMoney(totalContracted, activeContract?.currency)}
          sub="Start-up + close-out + quantidades"
        />
        <StatCard
          label="Overhead embutido"
          value={`${activeContract?.overheadPercent ?? 0}%`}
          sub={`Holdback: ${activeContract?.holdbackPercent ?? 0}%`}
        />
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "center", margin: "20px 0 10px", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--color-muted)", marginRight: 4 }}>Filtrar tipo:</span>
        <a
          href={`/orcamento?studyId=${studyId}`}
          style={{
            padding: "5px 10px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: !sp.kind ? "var(--color-primary)" : "var(--color-surface)",
            color: !sp.kind ? "white" : "var(--color-foreground)",
            border: "1px solid var(--color-border)",
          }}
        >
          Todos ({items.length})
        </a>
        {kinds.map((k) => (
          <a
            key={k}
            href={`/orcamento?studyId=${studyId}&kind=${k}`}
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              background: sp.kind === k ? "var(--color-primary)" : "var(--color-surface)",
              color: sp.kind === k ? "white" : "var(--color-foreground)",
              border: "1px solid var(--color-border)",
            }}
          >
            {kindLabel(k)} ({items.filter((i) => i.kind === k).length})
          </a>
        ))}
      </div>

      <Card padding={0}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <Th>Item</Th>
              <Th align="center">Tipo</Th>
              <Th align="center">Metodo</Th>
              <Th align="center">Visita vinculada</Th>
              <Th align="right">Qtd</Th>
              <Th align="right">Valor unit.</Th>
              <Th align="center">Auto?</Th>
              <Th align="center">Invoice?</Th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((i) => (
              <tr key={i.id}>
                <Td>
                  <div style={{ fontWeight: 600 }}>{i.name}</div>
                  {i.description ? (
                    <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>
                      {i.description}
                    </div>
                  ) : null}
                </Td>
                <Td align="center">
                  <span className="pill pill-info">{kindLabel(i.kind)}</span>
                </Td>
                <Td align="center" mono>{methodLabel(i.method)}</Td>
                <Td align="center" mono>{i.visitTemplate?.code ?? "-"}</Td>
                <Td align="right" mono>{i.defaultQuantity}</Td>
                <Td align="right" mono bold>{formatMoney(i.unitAmount, i.currency)}</Td>
                <Td align="center">{i.autoTrigger ? "Sim" : "-"}</Td>
                <Td align="center">{i.requiresInvoice ? "Sim" : "-"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
