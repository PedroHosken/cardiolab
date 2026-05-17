import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, Th, Td } from "@/components/Card";
import {
  Field,
  FormGrid,
  Input,
  PrimaryButton,
  SecondaryButton,
  Textarea,
  DangerButton,
} from "@/components/Form";
import { WizardStepper, buildWizardSteps } from "@/components/WizardSteps";
import { formatMoney } from "@/lib/format";
import { BILLING_MODE_OPTIONS } from "@/lib/billing-mode";
import { addBudgetItem, removeBudgetItem, finishCatalogStep } from "../actions";

export default async function ConfigurarP4Catalogo({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) notFound();

  const contract = await prisma.contractVersion.findFirst({
    where: { studyId: study.id, isActive: true },
  });

  const steps = buildWizardSteps(study.id);

  if (!contract) {
    return (
      <>
        <WizardStepper steps={steps} currentId="4" />
        <Card>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--color-danger)" }}>
            Cadastre o contrato no Passo 3 antes de configurar o catalogo.
          </h2>
          <Link href={`/pesquisas/${study.id}/configurar/contrato`}>
            <PrimaryButton style={{ marginTop: 14 }}>Ir para Passo 3</PrimaryButton>
          </Link>
        </Card>
      </>
    );
  }

  const items = await prisma.budgetItem.findMany({
    where: { contractVersionId: contract.id },
    orderBy: [{ boundToVisit: "desc" }, { name: "asc" }],
  });

  const bound = items.filter((i) => i.boundToVisit);
  const unbound = items.filter((i) => !i.boundToVisit);

  return (
    <>
      <WizardStepper steps={steps} currentId="4" />

      <Card>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
          Passo 4 - Catalogo de itens faturaveis
        </h2>
        <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "6px 0 18px" }}>
          Cadastre cada item que entra no faturamento. No proximo passo (Cronograma) voce decidira,
          em cada visita, quais itens marcados como <strong>"vinculado a visita"</strong> se aplicam.
          Itens <strong>fora de visita</strong> (start-up, close-out, pass-through, etc.) sao
          configurados na aba <strong>Financeiro → Itens fixos</strong> apos a ativacao da pesquisa.
        </p>

        <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>Adicionar item</h3>
        <form action={addBudgetItem}>
          <input type="hidden" name="studyId" value={study.id} />
          <FormGrid cols={2}>
            <Field label="Nome do item" required>
              <Input name="name" placeholder="Ex.: ECG de 12 derivacoes" required />
            </Field>
            <Field label={`Valor de pagamento (${contract.currency})`} required hint="Valor unitario por ocorrencia. Reajustes ficam no historico.">
              <Input name="unitAmount" type="number" step="0.01" min={0} defaultValue="0" required />
            </Field>

            <Field
              label="Vinculado a visita?"
              required
              hint="SIM = sera selecionado em cada visita do cronograma. NAO = sera tratado em passo proprio (Itens fixos)."
              span={2}
            >
              <div style={{ display: "flex", gap: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="radio" name="boundToVisit" value="yes" defaultChecked />
                  <span><strong>Sim</strong> — configuro manualmente em cada visita</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="radio" name="boundToVisit" value="no" />
                  <span><strong>Nao</strong> — item fixo / fora de visita</span>
                </label>
              </div>
            </Field>

            <Field
              label="Modalidade de faturamento"
              required
              span={2}
              hint="EDC: patrocinador informa o proforma. Pass-through: o centro gera e envia o proforma."
            >
              <div style={{ display: "grid", gap: 10 }}>
                {BILLING_MODE_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      fontSize: 13,
                      cursor: "pointer",
                      padding: "8px 10px",
                      border: "1px solid var(--color-border)",
                      borderRadius: 6,
                    }}
                  >
                    <input
                      type="radio"
                      name="billingMode"
                      value={o.value}
                      defaultChecked={o.value === "SPONSOR_EDC"}
                    />
                    <span>
                      <strong>{o.label}</strong>
                      <span style={{ display: "block", fontSize: 11, color: "var(--color-muted)" }}>
                        {o.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Descricao detalhada" span={2}>
              <Textarea
                name="description"
                placeholder="Ex.: ECG completo com laudo. Pago apos coleta valida e revisao do core lab."
                rows={3}
              />
            </Field>
          </FormGrid>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <PrimaryButton>+ Adicionar item</PrimaryButton>
          </div>
        </form>
      </Card>

      <h2 style={{ fontSize: 14, fontWeight: 600, margin: "24px 0 8px" }}>
        Itens vinculados a visitas ({bound.length})
      </h2>
      <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "0 0 8px" }}>
        Estes itens aparecem na pagina de cada visita (Passo 5 - Cronograma) com checkbox para selecionar
        quais se aplicam a cada visita.
      </p>
      <ItemsTable items={bound} studyId={study.id} />

      <h2 style={{ fontSize: 14, fontWeight: 600, margin: "24px 0 8px" }}>
        Itens fora de visita ({unbound.length})
      </h2>
      <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "0 0 8px" }}>
        Tratados separadamente (start-up, close-out, pass-through, milestones regulatorios). Apos a
        ativacao da pesquisa, configure-os em <strong>Financeiro → Itens fixos</strong>.
      </p>
      <ItemsTable items={unbound} studyId={study.id} />

      <form
        action={finishCatalogStep}
        style={{ marginTop: 18, display: "flex", justifyContent: "space-between" }}
      >
        <input type="hidden" name="studyId" value={study.id} />
        <Link href={`/pesquisas/${study.id}/configurar/contrato`}>
          <SecondaryButton>← Voltar (Contrato)</SecondaryButton>
        </Link>
        <PrimaryButton>Continuar para Cronograma →</PrimaryButton>
      </form>
    </>
  );
}

function ItemsTable({
  items,
  studyId,
}: {
  items: Array<{ id: string; name: string; description: string | null; unitAmount: number; currency: string }>;
  studyId: string;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <div style={{ fontSize: 13, color: "var(--color-muted)", textAlign: "center", padding: 12 }}>
          Nenhum item nesta lista.
        </div>
      </Card>
    );
  }
  return (
    <Card padding={0}>
      <table style={{ width: "100%", fontSize: 13 }}>
        <thead>
          <tr>
            <Th>Item</Th>
            <Th>Descricao</Th>
            <Th align="right">Valor</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <Td bold>{i.name}</Td>
              <Td style={{ fontSize: 12, color: "var(--color-muted)" }}>{i.description ?? "—"}</Td>
              <Td align="right" mono bold>{formatMoney(i.unitAmount, i.currency)}</Td>
              <Td align="center">
                <form action={removeBudgetItem}>
                  <input type="hidden" name="studyId" value={studyId} />
                  <input type="hidden" name="itemId" value={i.id} />
                  <DangerButton>Remover</DangerButton>
                </form>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
