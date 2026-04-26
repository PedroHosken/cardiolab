export type ChecklistSection = { title: string; items: string[] };

export const CHECKLIST_TEMPLATE: ChecklistSection[] = [
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
      "Visita extra apos data limite do protocolo",
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

export async function ensureStudyChecklist(
  studyId: string,
  prisma: import("@prisma/client").PrismaClient
) {
  const existing = await prisma.studyChecklistItem.count({ where: { studyId } });
  if (existing > 0) return;

  let order = 0;
  const data: Array<{
    studyId: string;
    category: string;
    label: string;
    orderIndex: number;
  }> = [];
  for (const section of CHECKLIST_TEMPLATE) {
    for (const item of section.items) {
      data.push({
        studyId,
        category: section.title,
        label: item,
        orderIndex: order++,
      });
    }
  }
  await prisma.studyChecklistItem.createMany({ data });
}
