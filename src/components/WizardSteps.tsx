import Link from "next/link";

export type WizardStep = {
  id: string;
  label: string;
  href: string;
};

export function WizardStepper({
  steps,
  currentId,
}: {
  steps: WizardStep[];
  currentId: string;
}) {
  const currentIdx = steps.findIndex((s) => s.id === currentId);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 22,
        padding: 14,
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        overflowX: "auto",
      }}
    >
      {steps.map((s, i) => {
        const isCurrent = i === currentIdx;
        const isDone = i < currentIdx;
        const tone = isCurrent
          ? { bg: "var(--color-primary)", fg: "white" }
          : isDone
          ? { bg: "#cffafe", fg: "var(--color-primary)" }
          : { bg: "#f1f5f9", fg: "var(--color-muted)" };
        return (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link
              href={isDone || isCurrent ? s.href : "#"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                borderRadius: 999,
                background: tone.bg,
                color: tone.fg,
                fontWeight: 600,
                fontSize: 12,
                whiteSpace: "nowrap",
                pointerEvents: isDone || isCurrent ? "auto" : "none",
                opacity: isDone || isCurrent ? 1 : 0.7,
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  background: isCurrent ? "rgba(255,255,255,0.25)" : isDone ? "white" : "#e2e8f0",
                  color: isCurrent ? "white" : isDone ? "var(--color-primary)" : "var(--color-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </span>
              {s.label}
            </Link>
            {i < steps.length - 1 ? (
              <div style={{ width: 24, height: 1, background: "var(--color-border)" }} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function buildWizardSteps(studyId: string): WizardStep[] {
  return [
    { id: "1", label: "Pesquisa", href: `/pesquisas/${studyId}/configurar` },
    { id: "2", label: "Patrocinador", href: `/pesquisas/${studyId}/configurar/patrocinador` },
    { id: "3", label: "Contrato", href: `/pesquisas/${studyId}/configurar/contrato` },
    { id: "4", label: "Cronograma", href: `/pesquisas/${studyId}/configurar/cronograma` },
    { id: "5", label: "Catalogo", href: `/pesquisas/${studyId}/configurar/catalogo` },
    { id: "6", label: "Revisao", href: `/pesquisas/${studyId}/configurar/revisao` },
  ];
}
