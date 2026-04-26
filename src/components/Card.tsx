import type { ReactNode, CSSProperties } from "react";

export function Card({
  children,
  style,
  padding = 18,
}: {
  children: ReactNode;
  style?: CSSProperties;
  padding?: number;
}) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
}) {
  const accentMap: Record<string, string> = {
    default: "var(--color-foreground)",
    primary: "var(--color-primary)",
    success: "var(--color-success)",
    warning: "var(--color-warning)",
    danger: "var(--color-danger)",
  };
  return (
    <Card>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6, color: accentMap[tone] }}>
        {value}
      </div>
      {sub ? (
        <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>{sub}</div>
      ) : null}
    </Card>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <table style={{ width: "100%", fontSize: 13 }}>{children}</table>
    </div>
  );
}

export function Th({ children, align = "left", width }: { children?: ReactNode; align?: "left" | "right" | "center"; width?: number | string }) {
  return (
    <th
      style={{
        textAlign: align,
        fontSize: 11,
        fontWeight: 600,
        color: "var(--color-muted)",
        textTransform: "uppercase",
        letterSpacing: 0.3,
        padding: "12px 14px",
        background: "#f9fafb",
        borderBottom: "1px solid var(--color-border)",
        width,
      }}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  bold,
  mono,
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <td
      style={{
        padding: "11px 14px",
        borderBottom: "1px solid var(--color-border)",
        textAlign: align,
        fontWeight: bold ? 600 : 400,
        fontFamily: mono ? "ui-monospace, SFMono-Regular, monospace" : undefined,
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}
