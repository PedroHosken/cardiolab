import { Card } from "@/components/Card";
import {
  Field,
  FormGrid,
  Input,
  PrimaryButton,
  Select,
  SecondaryButton,
} from "@/components/Form";
import { WizardStepper } from "@/components/WizardSteps";
import { createDraftStudy } from "../[id]/configurar/actions";
import Link from "next/link";

const PSEUDO_STEPS = [
  { id: "1", label: "Pesquisa", href: "#" },
  { id: "2", label: "Patrocinador", href: "#" },
  { id: "3", label: "Contrato", href: "#" },
  { id: "4", label: "Cronograma", href: "#" },
  { id: "5", label: "Catalogo", href: "#" },
  { id: "6", label: "Revisao", href: "#" },
];

export default function NovaPesquisaPage() {
  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <Link href="/pesquisas" style={{ fontSize: 12, color: "var(--color-muted)" }}>
          ← Pesquisas
        </Link>
        <h1 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 700 }}>Nova pesquisa</h1>
        <div style={{ fontSize: 13, color: "var(--color-muted)" }}>
          Configuracao guiada estilo Google Ads. Voce pode salvar como rascunho a qualquer momento e
          retomar depois.
        </div>
      </div>

      <WizardStepper steps={PSEUDO_STEPS} currentId="1" />

      <Card>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Passo 1 - Identificacao da pesquisa</h2>
        <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "6px 0 18px" }}>
          Comece pelos dados basicos. Voce podera editar tudo depois nas Configuracoes da pesquisa.
        </p>

        <form action={createDraftStudy}>
          <FormGrid cols={2}>
            <Field label="Numero do protocolo" required hint="Ex.: 1378-0020">
              <Input name="protocolNumber" placeholder="1378-0020" required />
            </Field>
            <Field label="Titulo curto" hint="Apelido para uso interno">
              <Input name="shortTitle" placeholder="EASi-HF Preserved" />
            </Field>
            <Field label="Titulo completo" required span={2}>
              <Input
                name="title"
                placeholder="A Phase III, Multinational, Multicenter, Randomized, Double-Blind..."
                required
              />
            </Field>
            <Field label="Fase" hint="Fase do estudo">
              <Select name="phase" defaultValue="">
                <option value="">Selecionar...</option>
                <option value="I">Fase I</option>
                <option value="II">Fase II</option>
                <option value="III">Fase III</option>
                <option value="IV">Fase IV</option>
                <option value="Observacional">Observacional</option>
              </Select>
            </Field>
            <Field label="Area terapeutica">
              <Input name="therapeuticArea" placeholder="Cardiologia / IC com FE preservada" />
            </Field>
            <Field label="Moeda padrao" required>
              <Select name="defaultCurrency" defaultValue="USD">
                <option value="USD">USD - Dolar americano</option>
                <option value="BRL">BRL - Real</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - Libra</option>
              </Select>
            </Field>
          </FormGrid>

          <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Link href="/pesquisas">
              <SecondaryButton>Cancelar</SecondaryButton>
            </Link>
            <PrimaryButton>Continuar para Patrocinador →</PrimaryButton>
          </div>
        </form>
      </Card>
    </>
  );
}
