import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, StatCard } from "@/components/Card";
import { PrimaryButton, SecondaryButton } from "@/components/Form";
import { WizardStepper, buildWizardSteps } from "@/components/WizardSteps";
import { formatDate, formatMoney } from "@/lib/format";
import { activateStudy } from "../actions";

export default async function ConfigurarP6({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const study = await prisma.study.findUnique({
    where: { id },
    include: {
      sponsor: true,
      cro: true,
      contractVersions: { where: { isActive: true }, include: { _count: { select: { budgetItems: true } } } },
      visitTemplates: true,
    },
  });
  if (!study) notFound();

  const contract = study.contractVersions[0];
  const itemCount = contract?._count.budgetItems ?? 0;
  const items = contract
    ? await prisma.budgetItem.findMany({ where: { contractVersionId: contract.id } })
    : [];

  const totalPerSubject = items
    .filter((i) => ["VISIT", "PHONE", "VIRTUAL", "HOME"].includes(i.kind) && i.method === "PER_OCCURRENCE")
    .reduce((s, i) => s + i.unitAmount, 0);
  const totalFixed = items
    .filter((i) => ["START_UP", "CLOSE_OUT"].includes(i.kind))
    .reduce((s, i) => s + i.unitAmount * i.defaultQuantity, 0);

  const steps = buildWizardSteps(study.id);

  const errors: string[] = [];
  if (!study.sponsorId) errors.push("Patrocinador nao definido (Passo 2)");
  if (!contract) errors.push("Contrato nao cadastrado (Passo 3)");
  if (study.visitTemplates.length === 0) errors.push("Nenhuma visita cadastrada (Passo 4)");
  if (itemCount === 0) errors.push("Nenhum item faturavel cadastrado (Passo 5)");

  return (
    <>
      <WizardStepper steps={steps} currentId="6" />

      <Card>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
          Passo 6 - Revisao e ativacao
        </h2>
        <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "6px 0 18px" }}>
          Confira o resumo da configuracao. Quando ativar, a pesquisa entra em operacao e podera receber
          pacientes, lancamentos e lotes.
        </p>

        {errors.length > 0 ? (
          <div
            style={{
              padding: 12,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              marginBottom: 18,
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--color-danger)", marginBottom: 6 }}>
              Pendencias antes de ativar:
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--color-danger)" }}>
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
          <StatCard label="Visitas" value={String(study.visitTemplates.length)} />
          <StatCard label="Itens faturaveis" value={String(itemCount)} tone="primary" />
          <StatCard label="Total por participante" value={formatMoney(totalPerSubject, contract?.currency)} />
          <StatCard label="Itens fixos" value={formatMoney(totalFixed, contract?.currency)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase" }}>
              Identificacao
            </h3>
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.7 }}>
              <div><strong>Protocolo:</strong> {study.protocolNumber}</div>
              <div><strong>Titulo:</strong> {study.title}</div>
              <div><strong>Fase:</strong> {study.phase ?? "-"}</div>
              <div><strong>Area:</strong> {study.therapeuticArea ?? "-"}</div>
              <div><strong>Moeda padrao:</strong> {study.defaultCurrency}</div>
              <div><strong>Patrocinador:</strong> {study.sponsor?.name ?? "-"}</div>
              <div><strong>CRO:</strong> {study.cro?.name ?? "-"}</div>
            </div>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase" }}>
              Contrato
            </h3>
            {contract ? (
              <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.7 }}>
                <div><strong>Versao:</strong> {contract.versionLabel}</div>
                <div><strong>Vigencia:</strong> {formatDate(contract.effectiveDate)}</div>
                <div><strong>Moeda:</strong> {contract.currency}</div>
                <div><strong>Overhead:</strong> {contract.overheadPercent}%</div>
                <div><strong>Holdback:</strong> {contract.holdbackPercent}%</div>
                <div style={{ marginTop: 6, fontSize: 12, color: "var(--color-muted)" }}>
                  {contract.paymentTerms}
                </div>
              </div>
            ) : (
              <div style={{ color: "var(--color-danger)", marginTop: 10 }}>Sem contrato</div>
            )}
          </div>
        </div>

        <form
          action={activateStudy}
          style={{ marginTop: 22, display: "flex", justifyContent: "space-between" }}
        >
          <input type="hidden" name="studyId" value={study.id} />
          <Link href={`/pesquisas/${study.id}/configurar/catalogo`}>
            <SecondaryButton>← Voltar</SecondaryButton>
          </Link>
          <PrimaryButton
            disabled={errors.length > 0}
            style={{ background: errors.length > 0 ? "#9ca3af" : "var(--color-success)" }}
          >
            Ativar pesquisa
          </PrimaryButton>
        </form>
      </Card>
    </>
  );
}
