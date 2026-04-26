import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, StatCard } from "@/components/Card";
import { ensureStudyChecklist } from "@/lib/checklist-template";
import { updateChecklistItem } from "./actions";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pendente" },
  { value: "IN_PROGRESS", label: "Em negociacao" },
  { value: "DONE", label: "OK / contratado" },
  { value: "NOT_APPLICABLE", label: "N/A" },
];

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  PENDING: { bg: "#fef3c7", fg: "#92400e" },
  IN_PROGRESS: { bg: "#dbeafe", fg: "#1d4ed8" },
  DONE: { bg: "#dcfce7", fg: "#15803d" },
  NOT_APPLICABLE: { bg: "#f1f5f9", fg: "#64748b" },
};

export default async function StudyChecklistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) notFound();

  await ensureStudyChecklist(id, prisma);

  const items = await prisma.studyChecklistItem.findMany({
    where: { studyId: id },
    orderBy: { orderIndex: "asc" },
  });

  const grouped = items.reduce<Record<string, typeof items>>((acc, it) => {
    if (!acc[it.category]) acc[it.category] = [];
    acc[it.category].push(it);
    return acc;
  }, {});

  const total = items.length;
  const done = items.filter((i) => i.status === "DONE").length;
  const inProg = items.filter((i) => i.status === "IN_PROGRESS").length;
  const pending = items.filter((i) => i.status === "PENDING").length;
  const na = items.filter((i) => i.status === "NOT_APPLICABLE").length;
  const progress = total > 0 ? Math.round((done / (total - na || 1)) * 100) : 0;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard
          label="Progresso"
          value={`${progress}%`}
          sub={`${done} de ${total - na} aplicaveis OK`}
          tone={progress >= 80 ? "success" : progress >= 40 ? "primary" : "warning"}
        />
        <StatCard label="Em negociacao" value={String(inProg)} tone="primary" />
        <StatCard label="Pendentes" value={String(pending)} tone="warning" />
        <StatCard label="N/A" value={String(na)} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 22 }}>
        {Object.entries(grouped).map(([cat, list]) => (
          <Card key={cat} padding={0}>
            <div
              style={{
                padding: "12px 16px",
                background: "#f8fafc",
                borderBottom: "1px solid var(--color-border)",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {cat}
            </div>
            <div>
              {list.map((it) => {
                const tone = STATUS_TONE[it.status] ?? STATUS_TONE.PENDING;
                return (
                  <form
                    key={it.id}
                    action={updateChecklistItem}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 160px 220px 90px",
                      gap: 10,
                      alignItems: "center",
                      padding: "10px 16px",
                      borderBottom: "1px solid var(--color-border)",
                      fontSize: 13,
                    }}
                  >
                    <input type="hidden" name="itemId" value={it.id} />
                    <input type="hidden" name="studyId" value={study.id} />
                    <div>{it.label}</div>
                    <span
                      style={{
                        background: tone.bg,
                        color: tone.fg,
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        textAlign: "center",
                      }}
                    >
                      {STATUS_OPTIONS.find((o) => o.value === it.status)?.label}
                    </span>
                    <select
                      name="status"
                      defaultValue={it.status}
                      style={{
                        padding: "6px 8px",
                        border: "1px solid var(--color-border)",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      style={{
                        padding: "6px 10px",
                        background: "var(--color-primary)",
                        color: "white",
                        border: 0,
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Salvar
                    </button>
                    <textarea
                      name="notes"
                      defaultValue={it.notes ?? ""}
                      placeholder="Anotacoes / status da negociacao"
                      style={{
                        gridColumn: "1 / -1",
                        padding: "6px 8px",
                        border: "1px solid var(--color-border)",
                        borderRadius: 6,
                        fontSize: 12,
                        minHeight: 36,
                        fontFamily: "inherit",
                        resize: "vertical",
                      }}
                    />
                  </form>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
