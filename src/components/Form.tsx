import type { ReactNode, CSSProperties } from "react";

const baseInputStyle: CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 13,
  background: "white",
  fontFamily: "inherit",
};

export function Field({
  label,
  hint,
  required,
  children,
  span = 1,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  span?: 1 | 2;
}) {
  return (
    <div style={{ gridColumn: span === 2 ? "1 / -1" : undefined, display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-foreground)" }}>
        {label}
        {required ? <span style={{ color: "var(--color-danger)", marginLeft: 4 }}>*</span> : null}
      </label>
      {children}
      {hint ? <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{hint}</div> : null}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { style, ...rest } = props;
  return <input {...rest} style={{ ...baseInputStyle, ...style }} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { style, ...rest } = props;
  return <textarea {...rest} style={{ ...baseInputStyle, minHeight: 80, ...style }} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { style, ...rest } = props;
  return <select {...rest} style={{ ...baseInputStyle, ...style }} />;
}

export function FormGrid({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 16,
      }}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  type = "submit",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...rest}
      style={{
        padding: "10px 18px",
        background: "var(--color-primary)",
        color: "white",
        border: 0,
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        ...rest.style,
      }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  type = "button",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...rest}
      style={{
        padding: "10px 18px",
        background: "var(--color-surface)",
        color: "var(--color-foreground)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        ...rest.style,
      }}
    >
      {children}
    </button>
  );
}

export function DangerButton({
  children,
  type = "button",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...rest}
      style={{
        padding: "8px 14px",
        background: "var(--color-surface)",
        color: "var(--color-danger)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        ...rest.style,
      }}
    >
      {children}
    </button>
  );
}
