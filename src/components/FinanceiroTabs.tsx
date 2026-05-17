"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function FinanceiroTabs({ studyId }: { studyId: string }) {
  const pathname = usePathname();
  const base = `/pesquisas/${studyId}/financeiro`;
  const tabs = [
    { href: base, label: "Ciclo de pagamentos", exact: true },
    { href: `${base}/itens-fixos`, label: "Itens fixos" },
    { href: `${base}/holdbacks`, label: "Holdbacks" },
    { href: `${base}/pass-through`, label: "Pass-through" },
    { href: `${base}/reajustes`, label: "Reajustes / renegociacao" },
  ];
  return (
    <nav
      style={{
        display: "flex",
        gap: 4,
        borderBottom: "1px solid var(--color-border)",
        marginBottom: 18,
        flexWrap: "wrap",
      }}
    >
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 500,
              color: active ? "var(--color-primary)" : "var(--color-muted)",
              borderBottom: `2px solid ${active ? "var(--color-primary)" : "transparent"}`,
              marginBottom: -1,
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
