"use client";

import { useId, useState } from "react";

export type VisitOption = {
  id: string;
  code: string;
  name: string;
  type: "Presencial" | "Telefone" | "Virtual" | "Domiciliar";
};

export function VisitMultiSelect({
  options,
  defaultSelectedIds = [],
  defaultAll = false,
}: {
  options: VisitOption[];
  defaultSelectedIds?: string[];
  defaultAll?: boolean;
}) {
  const allId = useId();
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelectedIds));
  const [all, setAll] = useState<boolean>(defaultAll);

  const toggle = (id: string) => {
    setAll(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setAllOn = () => {
    setAll(true);
    setSelected(new Set(options.map((o) => o.id)));
  };

  const clearAll = () => {
    setAll(false);
    setSelected(new Set());
  };

  return (
    <div>
      <input type="hidden" name="appliesToAllVisits" value={all ? "on" : "off"} id={allId} />

      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={setAllOn}
          style={{
            padding: "5px 10px",
            border: "1px solid var(--color-primary)",
            background: all ? "var(--color-primary)" : "var(--color-surface)",
            color: all ? "white" : "var(--color-primary)",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Marcar todas (atuais e futuras)
        </button>
        <button
          type="button"
          onClick={clearAll}
          style={{
            padding: "5px 10px",
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-foreground)",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Limpar
        </button>
        <span style={{ fontSize: 11, color: "var(--color-muted)", alignSelf: "center" }}>
          {all
            ? "Aplica a TODAS visitas (atuais + futuras adicionadas depois)"
            : `${selected.size} de ${options.length} visitas selecionadas`}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 6,
          maxHeight: 220,
          overflowY: "auto",
          padding: 8,
          border: "1px solid var(--color-border)",
          borderRadius: 8,
          background: "white",
        }}
      >
        {options.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--color-muted)", padding: 8 }}>
            Nenhuma visita cadastrada. Volte ao Passo 4 para adicionar.
          </div>
        ) : (
          options.map((o) => {
            const checked = all || selected.has(o.id);
            return (
              <label
                key={o.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: checked ? "#ecfeff" : "transparent",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                <input
                  type="checkbox"
                  name="visitTemplateIds"
                  value={o.id}
                  checked={checked}
                  onChange={() => toggle(o.id)}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontWeight: 600, fontFamily: "ui-monospace, monospace" }}>
                    {o.code}
                  </span>
                  <span style={{ color: "var(--color-muted)", fontSize: 11 }}>
                    {o.name} · {o.type}
                  </span>
                </div>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
