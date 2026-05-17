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
import { updateVisitTemplate } from "../../actions";
import { VISIT_KIND_OPTIONS } from "@/lib/visit-kind";
import { formatMoney } from "@/lib/format";

export default async function VisitEditPage({
  params,
}: {
  params: Promise<{ id: string; visitId: string }>;
}) {
  const { id, visitId } = await params;
  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) notFound();

  const visit = await prisma.visitTemplate.findFirst({
    where: { id: visitId, studyId: id },
    include: { budgetItemLinks: true },
  });
  if (!visit) notFound();

  const linkedIds = new Set(visit.budgetItemLinks.map((l) => l.budgetItemId));

  // Catalogo de itens faturaveis vinculaveis a visita (boundToVisit = true)
  const items = await prisma.budgetItem.findMany({
    where: {
      contractVersion: { studyId: id, isActive: true },
      boundToVisit: true,
    },
    orderBy: [{ name: "asc" }],
  });

  const visitTypeNow = visit.isPhone ? "phone" : visit.isVirtual ? "virtual" : visit.isHome ? "home" : "in_person";

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <Link href={`/pesquisas/${id}/configurar/cronograma`} style={{ fontSize: 12, color: "var(--color-muted)" }}>
          ← Cronograma de visitas
        </Link>
        <h1 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 700 }}>
          Editar visita {visit.code}
        </h1>
        <div style={{ fontSize: 13, color: "var(--color-muted)" }}>
          Atualize os dados da visita e selecione quais itens faturaveis se aplicam a ela.
        </div>
      </div>

      <form action={updateVisitTemplate}>
        <input type="hidden" name="studyId" value={study.id} />
        <input type="hidden" name="visitId" value={visit.id} />

        <Card style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Dados da visita</h2>
          <div style={{ marginTop: 14 }}>
            <FormGrid cols={3}>
              <Field label="Tipo de visita" required>
                <Select name="visitKind" defaultValue={visit.visitKind ?? "FOLLOWUP"} required>
                  {VISIT_KIND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Codigo de visita" required>
                <Input name="code" defaultValue={visit.code} required />
              </Field>
              <Field label="Nome / descricao" required>
                <Input name="name" defaultValue={visit.name} required />
              </Field>
              <Field
                label="Tempo de seguimento (dias)"
                hint="Triagem: NEGATIVO. Randomizacao: 0 (sera ignorado e gravado como 0). Seguimento: positivo."
              >
                <Input
                  name="dayOffset"
                  type="number"
                  step="1"
                  defaultValue={visit.dayOffset ?? ""}
                />
              </Field>
              <Field label="Tipo de atendimento">
                <Select name="visitType" defaultValue={visitTypeNow}>
                  <option value="in_person">Presencial</option>
                  <option value="phone">Telefone</option>
                  <option value="virtual">Virtual</option>
                  <option value="home">Domiciliar</option>
                </Select>
              </Field>
              <Field label="Janela (dias +/-)" hint="Numero unico. O sistema considera -N a +N.">
                <Input
                  name="windowDays"
                  type="number"
                  min={0}
                  defaultValue={visit.windowDays ?? ""}
                />
              </Field>
            </FormGrid>
          </div>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Itens faturaveis desta visita</h2>
          <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "6px 0 14px" }}>
            Marque quais procedimentos do catalogo se aplicam a esta visita. Apenas os itens marcados
            sao considerados na hora de gerar lancamentos quando a visita e realizada.
          </p>
          {items.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--color-muted)", padding: 12 }}>
              Nenhum item cadastrado ainda. Volte e configure o{" "}
              <Link
                href={`/pesquisas/${id}/configurar/catalogo`}
                style={{ color: "var(--color-primary)" }}
              >
                catalogo
              </Link>{" "}
              primeiro.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 8,
              }}
            >
              {items.map((it) => (
                <label
                  key={it.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                    background: linkedIds.has(it.id) ? "#f0f9ff" : "white",
                  }}
                >
                  <input
                    type="checkbox"
                    name="budgetItemIds"
                    value={it.id}
                    defaultChecked={linkedIds.has(it.id)}
                    style={{ marginTop: 3 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{it.name}</div>
                    <div style={{ fontSize: 11, color: "var(--color-muted)" }}>
                      {formatMoney(it.unitAmount, it.currency)}
                      {it.description ? ` · ${it.description}` : ""}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </Card>

        <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
          <Link href={`/pesquisas/${id}/configurar/cronograma`}>
            <SecondaryButton>Cancelar</SecondaryButton>
          </Link>
          <PrimaryButton>Salvar alteracoes</PrimaryButton>
        </div>
      </form>
    </>
  );
}
