import { notFound } from "next/navigation";
import Link from "next/link";
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
import { setSponsorCro } from "../actions";

export default async function ConfigurarP2({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) notFound();

  const sponsors = await prisma.sponsor.findMany({ orderBy: { name: "asc" } });
  const cros = await prisma.cro.findMany({ orderBy: { name: "asc" } });

  const steps = buildWizardSteps(study.id);

  return (
    <>
      <WizardStepper steps={steps} currentId="2" />

      <Card>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Passo 2 - Patrocinador e CRO</h2>
        <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "6px 0 18px" }}>
          Quem paga (patrocinador) e quem opera financeiramente (CRO, se houver).
        </p>

        <form action={setSponsorCro}>
          <input type="hidden" name="studyId" value={study.id} />

          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Patrocinador</h3>
          <FormGrid cols={2}>
            <Field label="Modo">
              <Select name="sponsorMode" defaultValue={study.sponsorId ? "existing" : "new"}>
                <option value="existing">Selecionar existente</option>
                <option value="new">Cadastrar novo</option>
              </Select>
            </Field>
            <Field label="Patrocinador existente">
              <Select name="sponsorId" defaultValue={study.sponsorId ?? ""}>
                <option value="">Nenhum selecionado</option>
                {sponsors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nome do novo patrocinador" hint="Use se 'Cadastrar novo'">
              <Input name="sponsorName" placeholder="Boehringer Ingelheim" />
            </Field>
            <Field label="Pais">
              <Input name="sponsorCountry" placeholder="Alemanha / EUA / ..." />
            </Field>
          </FormGrid>

          <h3 style={{ fontSize: 13, fontWeight: 600, margin: "24px 0 8px" }}>CRO pagadora (opcional)</h3>
          <FormGrid cols={2}>
            <Field label="Modo">
              <Select name="croMode" defaultValue={study.croId ? "existing" : "none"}>
                <option value="none">Sem CRO</option>
                <option value="existing">Selecionar existente</option>
                <option value="new">Cadastrar nova</option>
              </Select>
            </Field>
            <Field label="CRO existente">
              <Select name="croId" defaultValue={study.croId ?? ""}>
                <option value="">Nenhuma</option>
                {cros.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nome da nova CRO">
              <Input name="croName" placeholder="IQVIA RDS Brasil" />
            </Field>
            <Field label="Pais">
              <Input name="croCountry" placeholder="Brasil" />
            </Field>
          </FormGrid>

          <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "space-between" }}>
            <Link href={`/pesquisas/${study.id}/configurar`}>
              <SecondaryButton>← Voltar</SecondaryButton>
            </Link>
            <PrimaryButton>Salvar e continuar →</PrimaryButton>
          </div>
        </form>
      </Card>
    </>
  );
}
