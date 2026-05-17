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
import { VISIT_KIND_OPTIONS, visitKindLabel } from "@/lib/visit-kind";

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
    orderBy: [{ dayOffset: "asc" }, { orderIndex: "asc" }],
    include: { budgetItemLinks: true },
  });

  const steps = buildWizardSteps(study.id);

  return (
    <>
      <WizardStepper steps={steps} currentId="5" />

      <Card>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Passo 5 - Cronograma de visitas</h2>
        <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "6px 0 18px" }}>
          Cadastre as visitas do protocolo. Cada visita pode ser <strong>Triagem</strong>,{" "}
          <strong>Randomizacao</strong> ou <strong>Seguimento</strong>. O <strong>tempo de seguimento</strong>{" "}
          conta em dias a partir da randomizacao (negativo = triagem; 0 = randomizacao; positivo = seguimento).
          Apos randomizar um paciente, o sistema gera automaticamente as datas de todas as visitas.
        </p>

        <form action={addVisitTemplate}>
          <input type="hidden" name="studyId" value={study.id} />
          <FormGrid cols={3}>
            <Field
              label="Tipo de visita"
              required
              hint="Triagem (antes da randomizacao), Randomizacao (visita zero) ou Seguimento."
            >
              <Select name="visitKind" defaultValue="FOLLOWUP" required>
                {VISIT_KIND_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Codigo de visita" required hint="Ex.: V1, V2/W1, EoT, FU">
              <Input name="code" placeholder="V1" required />
            </Field>
            <Field label="Nome / descricao" required>
              <Input name="name" placeholder="Visita de baseline / randomizacao" required />
            </Field>
            <Field
              label="Tempo de seguimento (dias)"
              required
              hint="Triagem: NEGATIVO (ex.: -28). Randomizacao: 0 (preenchido automaticamente). Seguimento: positivo."
            >
              <Input
                name="dayOffset"
                type="number"
                step="1"
                placeholder="Ex.: -28 (triagem) | 0 (randomizacao) | 84 (semana 12)"
              />
            </Field>
            <Field label="Tipo de atendimento">
              <Select name="visitType" defaultValue="in_person">
                <option value="in_person">Presencial</option>
                <option value="phone">Telefone</option>
                <option value="virtual">Virtual</option>
                <option value="home">Domiciliar</option>
              </Select>
            </Field>
            <Field
              label="Janela (dias +/-)"
              hint="Numero unico. O sistema calcula -N a +N. Ex.: 3 = janela de 6 dias."
            >
              <Input name="windowDays" type="number" min={0} placeholder="3" />
            </Field>
            <Field
              label="Opcional — checkbox 1"
              hint="Ex.: Dentro da janela do protocolo"
              span={3}
            >
              <Input name="optionalCheckbox1" placeholder="Rotulo (vazio = nao exibe)" />
            </Field>
            <Field label="Opcional — checkbox 2">
              <Input name="optionalCheckbox2" placeholder="Rotulo" />
            </Field>
            <Field label="Opcional — checkbox 3">
              <Input name="optionalCheckbox3" placeholder="Rotulo" />
            </Field>
            <Field label="Opcional — texto livre" span={3}>
              <Input name="optionalText1Label" placeholder="Rotulo de um campo de texto" />
            </Field>
            <Field label="Opcional — numero" span={3}>
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
                <Th>Tipo</Th>
                <Th>Codigo de visita</Th>
                <Th>Nome</Th>
                <Th align="center">Tempo de seguimento</Th>
                <Th align="center">Atendimento</Th>
                <Th align="center">Janela</Th>
                <Th align="center">Itens</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 ? (
                <tr>
                  <Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td><Td>-</Td>
                </tr>
              ) : visits.map((v) => (
                <tr key={v.id}>
                  <Td>{visitKindLabel(v.visitKind)}</Td>
                  <Td bold mono>{v.code}</Td>
                  <Td>{v.name}</Td>
                  <Td align="center" mono>
                    {v.dayOffset == null ? "-" : v.dayOffset === 0 ? "0 (random.)" : v.dayOffset > 0 ? `D+${v.dayOffset}` : `D${v.dayOffset}`}
                  </Td>
                  <Td align="center">
                    {v.isPhone ? "Telefone" : v.isVirtual ? "Virtual" : v.isHome ? "Domiciliar" : "Presencial"}
                  </Td>
                  <Td align="center" mono>
                    {v.windowDays != null ? `±${v.windowDays}d` : "-"}
                  </Td>
                  <Td align="center" mono>{v.budgetItemLinks.length}</Td>
                  <Td align="center">
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <Link href={`/pesquisas/${study.id}/configurar/cronograma/${v.id}`}>
                        <SecondaryButton>Editar</SecondaryButton>
                      </Link>
                      <form action={removeVisitTemplate}>
                        <input type="hidden" name="studyId" value={study.id} />
                        <input type="hidden" name="visitId" value={v.id} />
                        <DangerButton>Remover</DangerButton>
                      </form>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <form action={finishVisitsStep} style={{ marginTop: 22, display: "flex", justifyContent: "space-between" }}>
        <input type="hidden" name="studyId" value={study.id} />
        <Link href={`/pesquisas/${study.id}/configurar/catalogo`}>
          <SecondaryButton>← Voltar (Catalogo)</SecondaryButton>
        </Link>
        <PrimaryButton>Continuar para Revisao →</PrimaryButton>
      </form>
    </>
  );
}
