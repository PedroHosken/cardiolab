import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Cardiolab Trials",
  description: "Software de gestao financeira de pesquisa clinica",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar />
          <main style={{ flex: 1, padding: "28px 32px", overflowX: "auto" }}>
            <div style={{ maxWidth: 1280, margin: "0 auto" }}>{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
