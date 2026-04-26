import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import {
  Field,
  FormGrid,
  Input,
  PrimaryButton,
  SecondaryButton,
  Select,
} from "@/components/Form";
import { WizardStepper, buildWizardSteps } from "@/components/WizardSteps";
import { updateBasics } from "./actions";
import Link from "next/link";

export default async function ConfigurarP1({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) notFound();

  const steps = buildWizardSteps(study.id);

  return (
    <>
      <WizardStepper steps={steps} currentId="1" />

      <Card>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Passo 1 - Identificacao</h2>
        <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "6px 0 18px" }}>
          Dados basicos da pesquisa.
        </p>

        <form action={updateBasics}>
          <input type="hidden" name="studyId" value={study.id} />
          <FormGrid cols={2}>
            <Field label="Numero do protocolo" required>
              <Input name="protocolNumber" defaultValue={study.protocolNumber} required />
            </Field>
            <Field label="Titulo curto">
              <Input name="shortTitle" defaultValue={study.shortTitle ?? ""} />
            </Field>
            <Field label="Titulo completo" required span={2}>
              <Input name="title" defaultValue={study.title} required />
            </Field>
            <Field label="Fase">
              <Select name="phase" defaultValue={study.phase ?? ""}>
                <option value="">Selecionar...</option>
                <option value="I">Fase I</option>
                <option value="II">Fase II</option>
                <option value="III">Fase III</option>
                <option value="IV">Fase IV</option>
                <option value="Observacional">Observacional</option>
              </Select>
            </Field>
            <Field label="Area terapeutica">
              <Input name="therapeuticArea" defaultValue={study.therapeuticArea ?? ""} />
            </Field>
            <Field label="Moeda padrao" required>
              <Select name="defaultCurrency" defaultValue={study.defaultCurrency}>
                <option value="USD">USD</option>
                <option value="BRL">BRL</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </Select>
            </Field>
            <Field
              label="Prefixo do registro de pacientes"
              hint="Base comum + 001, 002... Vazio ao salvar = protocolo + hifen."
              span={2}
            >
              <Input
                name="subjectCodePrefix"
                defaultValue={study.subjectCodePrefix || ""}
                placeholder={`Ex.: ${study.protocolNumber}-`}
              />
            </Field>
            <Field label="Digitos do sequencial">
              <Select
                name="subjectCodePadLength"
                defaultValue={String(Math.min(10, Math.max(1, study.subjectCodePadLength || 3)))}
              >
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </Select>
            </Field>
            <Field label="Proximo numero" hint="Proximo codigo ao cadastrar paciente.">
              <Input
                name="subjectCodeNextNumber"
                type="number"
                min={1}
                defaultValue={study.subjectCodeNextNumber ?? 1}
              />
            </Field>
          </FormGrid>

          <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Link href={`/pesquisas/${study.id}`}>
              <SecondaryButton>Cancelar</SecondaryButton>
            </Link>
            <PrimaryButton>Salvar e continuar →</PrimaryButton>
          </div>
        </form>
      </Card>
    </>
  );
}
