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
import { formatSubjectRegistrationCode } from "@/lib/subject-code";

export default async function NovoPacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const prefix = study.subjectCodePrefix || `${study.protocolNumber}-`;
  const pad = study.subjectCodePadLength ?? 3;
  const next = study.subjectCodeNextNumber ?? 1;
  const previewCode = formatSubjectRegistrationCode(prefix, next, pad);

  return (
    <Card>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Novo paciente</h2>
      <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "6px 0 18px" }}>
        Cadastre o paciente em <strong>triagem</strong>. O codigo e gerado automaticamente (
        <strong>prefixo do estudo</strong> + numero em ordem crescente). Depois voce podera
        randomizar ou marcar falha de triagem.
      </p>

      <div
        style={{
          marginBottom: 16,
          padding: "10px 14px",
          background: "#f0f9ff",
          border: "1px solid #bae6fd",
          borderRadius: 8,
          fontSize: 13,
        }}
      >
        <span style={{ color: "var(--color-muted)" }}>Proximo codigo: </span>
        <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>{previewCode}</span>
        <span style={{ fontSize: 11, color: "var(--color-muted)", marginLeft: 8 }}>
          (ajuste em Configurar pesquisa, passo 1, se precisar)
        </span>
      </div>

      <form action={addSubject}>
        <input type="hidden" name="studyId" value={study.id} />
        <FormGrid cols={2}>
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
