import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 16,
        marginBottom: 18,
        paddingBottom: 14,
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{title}</h1>
        {description ? (
          <p style={{ margin: "6px 0 0", color: "var(--color-muted)", fontSize: 13 }}>
            {description}
          </p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}
