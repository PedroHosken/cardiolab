import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, Th, Td } from "@/components/Card";
import { FinanceiroTabs } from "@/components/FinanceiroTabs";
import { formatMoney } from "@/lib/format";

export default async function ItensFixosPage({
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

  const items = contract
    ? await prisma.budgetItem.findMany({
        where: { contractVersionId: contract.id, boundToVisit: false },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <>
      <FinanceiroTabs studyId={id} />

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Itens fixos / fora de visita</h2>
        <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 6 }}>
          Itens cadastrados no catalogo com a opcao{" "}
          <strong>"Vinculado a visita = Nao"</strong>. Geralmente usados para start-up, close-out,
          pass-through (ex.: CEP/CONEP, traducoes), milestones regulatorios e taxas administrativas.
          Cada item e faturado em um lote proprio quando o evento ocorre.
        </p>
        <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 8 }}>
          Para incluir/editar, use o catalogo em{" "}
          <Link
            href={`/pesquisas/${id}/configurar/catalogo`}
            style={{ color: "var(--color-primary)" }}
          >
            Configuracoes → Passo 4 - Catalogo
          </Link>.
        </p>
      </Card>

      {items.length === 0 ? (
        <Card>
          <div style={{ fontSize: 13, color: "var(--color-muted)", textAlign: "center", padding: 16 }}>
            Nenhum item fixo cadastrado.
          </div>
        </Card>
      ) : (
        <Card padding={0}>
          <table style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <Th>Item</Th>
                <Th>Descricao</Th>
                <Th align="right">Valor unitario</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <Td bold>{i.name}</Td>
                  <Td style={{ fontSize: 12, color: "var(--color-muted)" }}>{i.description ?? "—"}</Td>
                  <Td align="right" mono bold>{formatMoney(i.unitAmount, i.currency)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
