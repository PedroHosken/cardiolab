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
  Select,
  DangerButton,
} from "@/components/Form";
import { WizardStepper, buildWizardSteps } from "@/components/WizardSteps";
import { formatMoney, kindLabel, methodLabel } from "@/lib/format";
import {
  addBudgetItem,
  removeBudgetItem,
  autoFillVisitItems,
  finishCatalogStep,
} from "../actions";

const KIND_OPTIONS = [
  "VISIT",
  "SCREEN_FAIL",
  "PHONE",
  "VIRTUAL",
  "HOME",
  "UNSCHEDULED",
  "START_UP",
  "CLOSE_OUT",
  "PASS_THROUGH",
  "CRF_TRIGGERED",
  "SUBSTUDY",
  "PHARMACY",
  "OTHER",
];

const METHOD_OPTIONS = ["PER_OCCURRENCE", "AMOUNT", "QUANTITY", "AS_INCURRED"];

export default async function ConfigurarP5({
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

  const items = contract
    ? await prisma.budgetItem.findMany({
        where: { contractVersionId: contract.id },
        include: { visitTemplate: true },
        orderBy: [{ kind: "asc" }, { name: "asc" }],
      })
    : [];

  const visits = await prisma.visitTemplate.findMany({
    where: { studyId: study.id },
    orderBy: { orderIndex: "asc" },
  });

  const steps = buildWizardSteps(study.id);

  if (!contract) {
    return (
      <>
        <WizardStepper steps={steps} currentId="5" />
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

  return (
    <>
      <WizardStepper steps={steps} currentId="5" />

      <Card>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
          Passo 5 - Catalogo de itens faturaveis
        </h2>
        <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "6px 0 18px" }}>
          Defina cada item faturavel: visitas, screen failure, start-up, close-out, pass-through,
          procedimentos extras CRF-triggered. Pode usar o atalho abaixo para popular as visitas em massa.
        </p>

        {visits.length > 0 ? (
          <form
            action={autoFillVisitItems}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
              padding: 12,
              background: "#ecfeff",
              border: "1px dashed var(--color-primary)",
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <input type="hidden" name="studyId" value={study.id} />
            <Field label="Atalho: gerar item faturavel para cada visita do cronograma" hint="Cria um BudgetItem PER_OCCURRENCE para cada VisitTemplate ainda sem item.">
              <Input
                name="baseAmount"
                type="number"
                step="0.01"
                defaultValue="1500"
                style={{ width: 160 }}
              />
            </Field>
            <PrimaryButton style={{ background: "var(--color-primary)" }}>
              Gerar itens das visitas
            </PrimaryButton>
          </form>
        ) : null}

        <h3 style={{ margin: "18px 0 8px", fontSize: 13, fontWeight: 600 }}>Adicionar item</h3>
        <form action={addBudgetItem}>
          <input type="hidden" name="studyId" value={study.id} />
          <FormGrid cols={3}>
            <Field label="Nome" required>
              <Input name="name" placeholder="Ex.: Visita V3 - Semana 4" required />
            </Field>
            <Field label="Tipo" required>
              <Select name="kind" defaultValue="VISIT">
                {KIND_OPTIONS.map((k) => (
                  <option key={k} value={k}>{kindLabel(k)} ({k})</option>
                ))}
              </Select>
            </Field>
            <Field label="Metodo" required>
              <Select name="method" defaultValue="PER_OCCURRENCE">
                {METHOD_OPTIONS.map((m) => (
                  <option key={m} value={m}>{methodLabel(m)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Valor unitario" required hint={`Em ${contract.currency}`}>
              <Input name="unitAmount" type="number" step="0.01" defaultValue="0" required />
            </Field>
            <Field label="Quantidade padrao">
              <Input name="defaultQuantity" type="number" step="0.01" defaultValue="1" />
            </Field>
            <Field label="Visita vinculada (opcional)">
              <Select name="visitTemplateId" defaultValue="">
                <option value="">Nenhuma</option>
                {visits.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.code} - {v.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Descricao" span={2}>
              <Input name="description" placeholder="Ex.: paga apos coleta de eco-stress" />
            </Field>
            <Field label="Flags">
              <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" name="autoTrigger" /> Auto via CRF
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" name="requiresInvoice" /> Pass-through (NF)
                </label>
              </div>
            </Field>
          </FormGrid>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <PrimaryButton>+ Adicionar item</PrimaryButton>
          </div>
        </form>
      </Card>

      <h2 style={{ fontSize: 14, fontWeight: 600, margin: "24px 0 10px" }}>
        Itens cadastrados ({items.length})
      </h2>
      <Card padding={0}>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <Th>Item</Th>
              <Th align="center">Tipo</Th>
              <Th align="center">Metodo</Th>
              <Th align="center">Visita</Th>
              <Th align="right">Qtd</Th>
              <Th align="right">Valor</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td>
              </tr>
            ) : items.map((i) => (
              <tr key={i.id}>
                <Td>
                  <div style={{ fontWeight: 600 }}>{i.name}</div>
                  {i.description ? <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{i.description}</div> : null}
                </Td>
                <Td align="center"><span className="pill pill-info">{kindLabel(i.kind)}</span></Td>
                <Td align="center" mono>{methodLabel(i.method)}</Td>
                <Td align="center" mono>{i.visitTemplate?.code ?? "-"}</Td>
                <Td align="right" mono>{i.defaultQuantity}</Td>
                <Td align="right" mono bold>{formatMoney(i.unitAmount, i.currency)}</Td>
                <Td align="center">
                  <form action={removeBudgetItem}>
                    <input type="hidden" name="studyId" value={study.id} />
                    <input type="hidden" name="itemId" value={i.id} />
                    <DangerButton>Remover</DangerButton>
                  </form>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <form
        action={finishCatalogStep}
        style={{ marginTop: 18, display: "flex", justifyContent: "space-between" }}
      >
        <input type="hidden" name="studyId" value={study.id} />
        <Link href={`/pesquisas/${study.id}/configurar/cronograma`}>
          <SecondaryButton>← Voltar</SecondaryButton>
        </Link>
        <PrimaryButton>Continuar para Revisao →</PrimaryButton>
      </form>
    </>
  );
}
