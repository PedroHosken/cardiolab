"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FlaskConical,
  ListChecks,
  Users,
  CalendarClock,
  Receipt,
  Layers,
  ScrollText,
} from "lucide-react";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pesquisas", label: "Pesquisas", icon: FlaskConical },
  { href: "/orcamento", label: "Catalogo de Itens", icon: ListChecks },
  { href: "/pacientes", label: "Pacientes", icon: Users },
  { href: "/visitas", label: "Visitas", icon: CalendarClock },
  { href: "/lancamentos", label: "Lancamentos", icon: Receipt },
  { href: "/lotes", label: "Lotes / Faturas", icon: Layers },
  { href: "/checklist", label: "Checklist Negociacao", icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside
      style={{
        width: 240,
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)",
        padding: "20px 12px",
        height: "100vh",
        position: "sticky",
        top: 0,
        flexShrink: 0,
      }}
    >
      <Link href="/" style={{ display: "block", padding: "0 8px 18px" }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "var(--color-primary)" }}>
          Cardiolab Trials
        </div>
        <div style={{ fontSize: 11, color: "var(--color-muted)" }}>
          Faturamento de pesquisa clinica
        </div>
      </Link>
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((it) => {
          const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: active ? "var(--color-primary)" : "var(--color-foreground)",
                background: active ? "#ecfeff" : "transparent",
              }}
            >
              <Icon size={16} />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div
        style={{
          marginTop: 24,
          padding: "10px 12px",
          fontSize: 11,
          color: "var(--color-muted)",
          borderTop: "1px dashed var(--color-border)",
          paddingTop: 14,
        }}
      >
        <div style={{ fontWeight: 600, color: "var(--color-foreground)", marginBottom: 4 }}>
          Cardresearch
        </div>
        <div>Belo Horizonte / MG</div>
        <div style={{ marginTop: 6 }}>v0.1.0 (MVP)</div>
      </div>
    </aside>
  );
}
