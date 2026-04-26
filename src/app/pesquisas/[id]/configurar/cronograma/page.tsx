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
import { addVisitTemplate, removeVisitTemplate, finishVisitsStep } from "../actions";

export default async function ConfigurarP4({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) notFound();

  const visits = await prisma.visitTemplate.findMany({
    where: { studyId: study.id },
    orderBy: { orderIndex: "asc" },
  });

  const steps = buildWizardSteps(study.id);

  return (
    <>
      <WizardStepper steps={steps} currentId="4" />

      <Card>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Passo 4 - Cronograma de visitas</h2>
        <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "6px 0 18px" }}>
          Cadastre todas as visitas previstas no protocolo. Cada visita pode depois receber valor faturavel
          no Passo 5. Voce pode adicionar mais visitas a qualquer momento.
        </p>

        <form action={addVisitTemplate}>
          <input type="hidden" name="studyId" value={study.id} />
          <FormGrid cols={3}>
            <Field label="Codigo" required hint="Ex.: V1, V2/W1, EoT, FU">
              <Input name="code" placeholder="V1" required />
            </Field>
            <Field label="Nome / descricao" required>
              <Input name="name" placeholder="Visita de baseline / randomizacao" required />
            </Field>
            <Field label="Semana relativa">
              <Input name="weekOffset" type="number" placeholder="0" />
            </Field>
            <Field label="Tipo">
              <Select name="visitType" defaultValue="in_person">
                <option value="in_person">Presencial</option>
                <option value="phone">Telefone</option>
                <option value="virtual">Virtual</option>
                <option value="home">Domiciliar</option>
              </Select>
            </Field>
            <Field label="Janela - dias">
              <Input name="windowMinusDays" type="number" placeholder="3" />
            </Field>
            <Field label="Janela + dias">
              <Input name="windowPlusDays" type="number" placeholder="3" />
            </Field>
            <Field
              label="Opcional — checkbox 1"
              hint="Ex.: Dentro da janela do protocolo"
              span={2}
            >
              <Input name="optionalCheckbox1" placeholder="Rotulo (vazio = nao exibe)" />
            </Field>
            <Field label="Opcional — checkbox 2">
              <Input name="optionalCheckbox2" placeholder="Rotulo" />
            </Field>
            <Field label="Opcional — checkbox 3">
              <Input name="optionalCheckbox3" placeholder="Rotulo" />
            </Field>
            <Field label="Opcional — texto livre" span={2}>
              <Input name="optionalText1Label" placeholder="Rotulo de um campo de texto" />
            </Field>
            <Field label="Opcional — numero" span={2}>
              <Input name="optionalNumber1Label" placeholder="Rotulo de um campo numerico (ex.: dias de desvio)" />
            </Field>
          </FormGrid>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <PrimaryButton>+ Adicionar visita</PrimaryButton>
          </div>
        </form>
      </Card>

      <div style={{ marginTop: 16 }}>
        <Card padding={0}>
          <table style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <Th>Codigo</Th>
                <Th>Nome</Th>
                <Th align="center">Semana</Th>
                <Th align="center">Tipo</Th>
                <Th align="center">Janela</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 ? (
                <tr>
                  <Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td>
                </tr>
              ) : visits.map((v) => (
                <tr key={v.id}>
                  <Td bold mono>{v.code}</Td>
                  <Td>{v.name}</Td>
                  <Td align="center" mono>{v.weekOffset ?? "-"}</Td>
                  <Td align="center">
                    {v.isPhone ? "Telefone" : v.isVirtual ? "Virtual" : v.isHome ? "Domiciliar" : "Presencial"}
                  </Td>
                  <Td align="center" mono>
                    {v.windowMinusDays || v.windowPlusDays ? `-${v.windowMinusDays ?? 0} / +${v.windowPlusDays ?? 0}` : "-"}
                  </Td>
                  <Td align="center">
                    <form action={removeVisitTemplate}>
                      <input type="hidden" name="studyId" value={study.id} />
                      <input type="hidden" name="visitId" value={v.id} />
                      <DangerButton>Remover</DangerButton>
                    </form>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <form
        action={finishVisitsStep}
        style={{ marginTop: 18, display: "flex", justifyContent: "space-between" }}
      >
        <input type="hidden" name="studyId" value={study.id} />
        <Link href={`/pesquisas/${study.id}/configurar/contrato`}>
          <SecondaryButton>← Voltar</SecondaryButton>
        </Link>
        <PrimaryButton>Continuar para Catalogo →</PrimaryButton>
      </form>
    </>
  );
}
