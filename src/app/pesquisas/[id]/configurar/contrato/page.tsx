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
  Textarea,
} from "@/components/Form";
import { WizardStepper, buildWizardSteps } from "@/components/WizardSteps";
import { setContract } from "../actions";

const DEFAULT_TERMS = `Pagamento trimestral em USD por wire transfer.
90% do valor liquido por procedimento concluido + 10% holdback liberado no encerramento.
Pass-through itens (ex.: CEP/CONEP, traducoes) faturados conforme NF/recibo.
Reajuste anual conforme indice acordado.`;

export default async function ConfigurarP3({
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

  return (
    <>
      <WizardStepper steps={steps} currentId="3" />

      <Card>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Passo 3 - Contrato vigente</h2>
        <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "6px 0 18px" }}>
          Versao do CTA atual + termos financeiros (overhead, holdback, moeda, formato de pagamento).
          Cada emenda futura criara uma nova versao versionada.
        </p>

        <form action={setContract}>
          <input type="hidden" name="studyId" value={study.id} />
          <FormGrid cols={2}>
            <Field label="Rotulo da versao" required hint="Ex.: 'v2 (Amendment 1)'">
              <Input
                name="versionLabel"
                defaultValue={contract?.versionLabel ?? "v1"}
                required
              />
            </Field>
            <Field label="Data de vigencia" required>
              <Input
                name="effectiveDate"
                type="date"
                defaultValue={
                  contract?.effectiveDate
                    ? new Date(contract.effectiveDate).toISOString().slice(0, 10)
                    : ""
                }
                required
              />
            </Field>
            <Field label="Moeda do contrato" required>
              <Select name="currency" defaultValue={contract?.currency ?? study.defaultCurrency}>
                <option value="USD">USD</option>
                <option value="BRL">BRL</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </Select>
            </Field>
            <Field label="Overhead (%)" hint="Embutido nos valores (ex.: 35)">
              <Input
                name="overheadPercent"
                type="number"
                step="0.1"
                defaultValue={contract?.overheadPercent ?? 35}
              />
            </Field>
            <Field label="Holdback (%)" hint="Retido pelo sponsor ate encerramento (ex.: 10)">
              <Input
                name="holdbackPercent"
                type="number"
                step="0.1"
                defaultValue={contract?.holdbackPercent ?? 10}
              />
            </Field>
            <Field label="Frequencia / forma de pagamento" hint="Texto livre" span={2}>
              <Textarea
                name="paymentTerms"
                defaultValue={contract?.paymentTerms ?? DEFAULT_TERMS}
                rows={4}
              />
            </Field>
            <Field label="Notas internas" span={2}>
              <Textarea name="notes" defaultValue={contract?.notes ?? ""} rows={3} />
            </Field>
          </FormGrid>

          <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "space-between" }}>
            <Link href={`/pesquisas/${study.id}/configurar/patrocinador`}>
              <SecondaryButton>← Voltar</SecondaryButton>
            </Link>
            <PrimaryButton>Salvar e continuar →</PrimaryButton>
          </div>
        </form>
      </Card>
    </>
  );
}
