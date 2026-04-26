import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import {
  Field,
  FormGrid,
  Input,
  PrimaryButton,
  SecondaryButton,
  Textarea,
} from "@/components/Form";
import { addSubject } from "../actions";

export default async function NovoPacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) notFound();

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Novo paciente</h2>
      <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "6px 0 18px" }}>
        Cadastre o paciente em <strong>triagem</strong>. Depois voce podera randomizar (vira "em
        estudo" e todas as visitas ficam programadas) ou marcar como falha de triagem.
      </p>

      <form action={addSubject}>
        <input type="hidden" name="studyId" value={study.id} />
        <FormGrid cols={2}>
          <Field
            label="Codigo do paciente"
            required
            hint="Ex.: 1076014-001 (segue a regra do CTA / IRT)"
          >
            <Input name="subjectCode" placeholder="1076014-001" required />
          </Field>
          <Field label="Data de entrada em triagem" required>
            <Input name="screeningDate" type="date" defaultValue={today} required />
          </Field>
          <Field label="Anotacoes" hint="Opcional - relevante para acompanhamento" span={2}>
            <Textarea
              name="notes"
              placeholder="Ex.: indicado pelo Dr. Marcelo (UTI HU). Iniciou TFV em 12/04."
              rows={3}
            />
          </Field>
        </FormGrid>

        <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Link href={`/pesquisas/${study.id}/pacientes`}>
            <SecondaryButton>Cancelar</SecondaryButton>
          </Link>
          <PrimaryButton>Adicionar em triagem →</PrimaryButton>
        </div>
      </form>
    </Card>
  );
}
