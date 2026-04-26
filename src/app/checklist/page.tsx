import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";

const sections: Array<{ title: string; items: string[] }> = [
  {
    title: "A) Clausulas contratuais",
    items: [
      "Termos de pagamento (frequencia, %, holdback, prazo, juros, formato e endereco da invoice)",
      "Moeda, politica cambial e responsabilidade pela variacao",
      "Overhead/F&A (% e o que cobre)",
      "Quem aprova a invoice e SLA de pagamento",
      "Hipoteses de nao pagamento (ex.: major protocol violation) - listar exatamente",
      "Clausula de auditoria e devolucao",
      "Lei aplicavel, foro, confidencialidade, IP, indemnity, seguro",
      "Servicos de traducao/interprete (Brasil - frequentemente esquecido)",
    ],
  },
  {
    title: "B) Start-Up Fees (preferencialmente nao reembolsaveis)",
    items: [
      "Non-Refundable Start-Up Fee",
      "CEP/CONEP/IRB Initial Submission Preparation Fee",
      "Insurance/Coverage Analysis Fee",
      "Source Document Development Fee",
      "Pharmacy Set-Up Fee",
      "Lab Set-Up Fee",
      "3rd Party Vendor Integration Fee (ePRO, IRT, eCOA, central lab etc.)",
      "Mock Subject / QA Run-Through Fee",
      "Protocol-Required Test Scans Fee",
      "Duplicative GCP Training Fee",
      "Document Preparation Fee (initial submission)",
    ],
  },
  {
    title: "C) Per Subject / Per Visit",
    items: [
      "Tabela completa de visitas com valor por visita (incluindo overhead)",
      "Screening visit + Screening Failure (mesmo valor ou pre-acordado)",
      "Phone, virtual e home visit como tipos distintos",
      "Unscheduled visit - valor pre-acordado",
      "Reconsent fee",
      "Subestudos opcionais (taxa por participante e por visita)",
      "Visita extra apos data limite do protocolo (ex.: V16+ no nosso CTA)",
    ],
  },
  {
    title: "D) Procedimentos condicionais (extras)",
    items: [
      "Lista exaustiva de procedimentos pagaveis com gatilho (CRF data ou invoice)",
      "Repeat/extra labs e imagens com valor unitario",
      "SAE fee (gestao e relatorio)",
      "ECG/eco/PK adicional",
      "Daily facility charge (PK overnight)",
      "ACTH / cortisol / FSH / pregnancy test extras",
      "Tratamento de injuria relacionada ao protocolo",
    ],
  },
  {
    title: "E) Inter-protocol / operacional",
    items: [
      "Recruitment activity (staff time + 3rd party)",
      "Safety report review fee",
      "Scheduled monitoring visit fee (se aplicavel)",
      "Regulatory/audit visit fee",
      "Unscheduled monitoring inquiry response fee",
      "Protocol Amendment review/setup fee (cada emenda!)",
      "Subject reconsenting fee",
      "Translation/interpreter fee",
      "Subject transportation/meals/lodging",
      "Periodic Protocol Maintenance fee",
      "Change of Monitor fee",
      "Special Requested Added Staff fee",
      "Certified Copy of EHR fee",
      "Subject Helpdesk (tech) fee",
    ],
  },
  {
    title: "F) Pass-through",
    items: [
      "CEP/CONEP fees (initial + annual + amendment + closeout)",
      "ANVISA fees",
      "Imaging/laboratorio local",
      "Recruitment advertising",
      "Couriers, study supplies, rescue medications",
      "IP destruction",
    ],
  },
  {
    title: "G) Close-Out",
    items: [
      "Protocol Close-Out Fee",
      "CEP Close-Out Submission Preparation Fee",
      "Pharmacy Close-Out Fee",
      "IP Return/Destruction Fee",
      "Record Packaging Fee",
      "Archiving Fee (Brasil exige guarda longa - sempre incluir)",
      "Records Destruction & e-recycling",
      "Records Storage anual (durante todo o periodo legal)",
    ],
  },
  {
    title: "H) Outros (frequentemente esquecidos)",
    items: [
      "Unexpected Cost Allotment Fund (verba de contingencia)",
      "Post-Close-Out Record Retrieval Fee",
      "Cancelled Protocol Fee (compensacao se sponsor cancelar antes do enrollment)",
      "Reajuste anual por inflacao",
      "Late payment interest",
    ],
  },
];

export default function ChecklistPage() {
  return (
    <>
      <PageHeader
        title="Checklist de negociacao de CTA"
        description="Itens que sempre devemos discutir e tentar incluir em cada novo contrato. Baseado no SCRS Site Invoiceables Toolkit + boas praticas SOCRA + nosso CTA atual."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {sections.map((s) => (
          <Card key={s.title}>
            <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700 }}>{s.title}</h3>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
              {s.items.map((it, i) => (
                <li key={i} style={{ fontSize: 13 }}>{it}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card style={{ marginTop: 18, background: "#fffbeb", borderColor: "#fde68a" }}>
        <strong style={{ fontSize: 13 }}>Fontes</strong>
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--color-muted)" }}>
          <li>SCRS - Site Invoiceables Toolkit (Society for Clinical Research Sites, 2022)</li>
          <li>SOCRA - Budget Development and Negotiation for Investigative Sites</li>
          <li>Pharmaceutical Outsourcing - Keys to Successfully Negotiate Site Budgets and Contracts</li>
          <li>Trafford Research - The Real Cost of Pass-through Expenses in Clinical Trials (2024)</li>
          <li>Estrutura do CTA real BI 1378-0020 (Boehringer Ingelheim / IQVIA / Cardresearch)</li>
        </ul>
      </Card>
    </>
  );
}
