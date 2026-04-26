"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  Users,
  CalendarClock,
  Receipt,
  Layers,
  ScrollText,
  Settings,
} from "lucide-react";

export function StudyTabs({ studyId }: { studyId: string }) {
  const pathname = usePathname();
  const base = `/pesquisas/${studyId}`;
  const tabs = [
    { href: base, label: "Visao geral", icon: LayoutDashboard, exact: true },
    { href: `${base}/orcamento`, label: "Orcamento", icon: ListChecks },
    { href: `${base}/pacientes`, label: "Pacientes", icon: Users },
    { href: `${base}/visitas`, label: "Visitas", icon: CalendarClock },
    { href: `${base}/lancamentos`, label: "Lancamentos", icon: Receipt },
    { href: `${base}/lotes`, label: "Lotes", icon: Layers },
    { href: `${base}/checklist`, label: "Checklist", icon: ScrollText },
    { href: `${base}/configurar`, label: "Configuracoes", icon: Settings },
  ];
  return (
    <nav
      style={{
        display: "flex",
        gap: 2,
        borderBottom: "1px solid var(--color-border)",
        marginBottom: 18,
        overflowX: "auto",
      }}
    >
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: 500,
              color: active ? "var(--color-primary)" : "var(--color-muted)",
              borderBottom: `2px solid ${active ? "var(--color-primary)" : "transparent"}`,
              marginBottom: -1,
              whiteSpace: "nowrap",
            }}
          >
            <Icon size={14} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
