import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, Th, Td } from "@/components/Card";
import { FinanceiroTabs } from "@/components/FinanceiroTabs";
import {
  Field,
  FormGrid,
  Input,
  PrimaryButton,
  Select,
  Textarea,
  DangerButton,
} from "@/components/Form";
import { formatDate, formatMoney } from "@/lib/format";
import { applyAnnualAdjustment, applyRenegotiation, removeAdjustment } from "../actions";

export default async function ReajustesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) notFound();

  const contract = await prisma.contractVersion.findFirst({
    where: { studyId: id, isActive: true },
    include: {
      adjustments: { orderBy: { effectiveFrom: "desc" } },
      budgetItems: {
        include: { prices: { orderBy: { effectiveFrom: "desc" } } },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!contract) {
    return (
      <>
        <FinanceiroTabs studyId={id} />
        <Card>
          <div style={{ color: "var(--color-danger)", fontWeight: 600 }}>
            Pesquisa sem contrato ativo. Configure o contrato no Passo 3 do assistente.
          </div>
        </Card>
      </>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <FinanceiroTabs studyId={id} />

      {/* Reajuste anual por indice */}
      <Card style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Reajuste anual por indice</h2>
        <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "6px 0 16px" }}>
          Informe o indice (texto livre) e o percentual. O sistema multiplica o preco vigente de
          <strong> todos </strong>os itens a partir da data informada. Os precos antigos ficam no
          historico — visitas anteriores sao calculadas pelo valor vigente naquela data.
        </p>
        <form action={applyAnnualAdjustment}>
          <input type="hidden" name="studyId" value={study.id} />
          <FormGrid cols={3}>
            <Field label="Indice / referencia" required hint="Ex.: IPCA 2026, IGPM-FGV">
              <Input name="indexLabel" placeholder="IPCA 2026" required />
            </Field>
            <Field label="Percentual (%)" required hint="Ex.: 4.38 → +4,38%">
              <Input name="percent" type="number" step="0.01" placeholder="4.38" required />
            </Field>
            <Field label="A partir de" required>
              <Input name="effectiveFrom" type="date" defaultValue={today} required />
            </Field>
            <Field label="Notas" span={2}>
              <Textarea name="notes" rows={2} placeholder="Ex.: indice acordado em CTA Section H" />
            </Field>
          </FormGrid>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
            <PrimaryButton>Aplicar reajuste</PrimaryButton>
          </div>
        </form>
      </Card>

      {/* Renegociacao por item */}
      <Card style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Renegociacao contratual</h2>
        <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "6px 0 16px" }}>
          Informe novos valores APENAS dos itens reajustados. Os demais permanecem no preco vigente.
          A data pode ser retroativa (lancamentos anteriores ficam intactos; novos lancamentos a
          partir dela usam o novo valor).
        </p>
        <form action={applyRenegotiation}>
          <input type="hidden" name="studyId" value={study.id} />
          <FormGrid cols={3}>
            <Field label="Rotulo" hint="Ex.: 'Renegociacao Amend 3'">
              <Input name="indexLabel" placeholder="Renegociacao Amend 3" />
            </Field>
            <Field label="Vigencia (a partir de)" required>
              <Input name="effectiveFrom" type="date" defaultValue={today} required />
            </Field>
            <Field label="Notas" span={3}>
              <Textarea name="notes" rows={2} placeholder="Motivo / referencia do amendment" />
            </Field>
          </FormGrid>

          <div style={{ marginTop: 16, border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <Th>Item</Th>
                  <Th align="right">Preco vigente</Th>
                  <Th align="right" width={180}>Novo valor</Th>
                </tr>
              </thead>
              <tbody>
                {contract.budgetItems.map((it) => {
                  const current = it.prices[0]?.unitAmount ?? it.unitAmount;
                  return (
                    <tr key={it.id}>
                      <Td>
                        <div style={{ fontWeight: 600 }}>{it.name}</div>
                        <div style={{ fontSize: 11, color: "var(--color-muted)" }}>
                          {it.kind} · {it.method}
                        </div>
                      </Td>
                      <Td align="right" mono>{formatMoney(current, it.currency)}</Td>
                      <Td align="right">
                        <Input
                          name={`newPrice_${it.id}`}
                          type="number"
                          step="0.01"
                          placeholder="(deixe vazio para nao alterar)"
                          style={{ textAlign: "right" }}
                        />
                      </Td>
                    </tr>
                  );
                })}
                {contract.budgetItems.length === 0 ? (
                  <tr><Td>Nenhum item cadastrado.</Td><Td>-</Td><Td>-</Td></tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <PrimaryButton>Salvar renegociacao</PrimaryButton>
          </div>
        </form>
      </Card>

      {/* Historico */}
      <Card padding={0}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-border)" }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Historico de reajustes</h3>
        </div>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <Th>Vigente em</Th>
              <Th>Tipo</Th>
              <Th>Rotulo / indice</Th>
              <Th align="right">Multiplicador</Th>
              <Th>Notas</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {contract.adjustments.length === 0 ? (
              <tr><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td></tr>
            ) : contract.adjustments.map((a) => (
              <tr key={a.id}>
                <Td mono>{formatDate(a.effectiveFrom)}</Td>
                <Td>
                  <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: a.kind === "ANNUAL_INDEX" ? "#dbeafe" : "#fce7f3" }}>
                    {a.kind === "ANNUAL_INDEX" ? "Reajuste anual" : "Renegociacao"}
                  </span>
                </Td>
                <Td>{a.indexLabel ?? "-"}</Td>
                <Td align="right" mono>
                  {a.multiplier ? `${((a.multiplier - 1) * 100).toFixed(2)}%` : "-"}
                </Td>
                <Td style={{ fontSize: 12, color: "var(--color-muted)" }}>{a.notes ?? "-"}</Td>
                <Td align="center">
                  <form action={removeAdjustment}>
                    <input type="hidden" name="studyId" value={study.id} />
                    <input type="hidden" name="adjustmentId" value={a.id} />
                    <DangerButton>Remover</DangerButton>
                  </form>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
