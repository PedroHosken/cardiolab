/**
 * Seed do banco com dados reais do CTA BI 1378-0020 (EASi-HF Preserved)
 * Patrocinador: Boehringer Ingelheim | CRO: IQVIA | Site: Cardresearch
 * Emenda 1, em vigor 21/Ago/2025. Valores em USD ja com 35% de overhead.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Limpando base...");
  await prisma.auditLog.deleteMany();
  await prisma.billableLine.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.subjectVisit.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.budgetItem.deleteMany();
  await prisma.visitTemplate.deleteMany();
  await prisma.contractVersion.deleteMany();
  await prisma.study.deleteMany();
  await prisma.cro.deleteMany();
  await prisma.sponsor.deleteMany();

  console.log("Criando Sponsor e CRO...");
  const sponsor = await prisma.sponsor.create({
    data: {
      name: "Boehringer Ingelheim International GmbH",
      country: "DE",
    },
  });

  const cro = await prisma.cro.create({
    data: {
      name: "IQVIA RDS Inc.",
      country: "US",
    },
  });

  console.log("Criando Study 1378-0020...");
  const study = await prisma.study.create({
    data: {
      protocolNumber: "1378-0020",
      title:
        "EASi-HF Preserved - Estudo de fase III, duplo-cego, randomizado, de superioridade e de grupos paralelos para avaliar a eficacia e a seguranca do uso associado de vicadrostate (BI 690517) oral e empagliflozina em comparacao com placebo e empagliflozina em participantes com insuficiencia cardiaca sintomatica (IC: Classe II-IV da NYHA) e fracao de ejecao do ventriculo esquerdo (FEVE) >= 40%",
      shortTitle: "EASi-HF Preserved",
      phase: "III",
      therapeuticArea: "Cardiologia / Insuficiencia Cardiaca",
      status: "ACTIVE",
      defaultCurrency: "USD",
      sponsorId: sponsor.id,
      croId: cro.id,
    },
  });

  console.log("Criando ContractVersion v2 (Amendment 1)...");
  const contract = await prisma.contractVersion.create({
    data: {
      studyId: study.id,
      versionLabel: "v2 (Amendment 1)",
      effectiveDate: new Date("2025-08-21"),
      currency: "USD",
      overheadPercent: 35,
      holdbackPercent: 10,
      paymentTerms:
        "Pagamento mensal por atividade concluida. 90% pago com base em dados de inclusao do mes anterior. 10% retido (holdback) liberado no closeout apos aceite final do Sponsor.",
      notes:
        "Emenda em vigor 21-Ago-2025 refletindo Protocolo v3.0 de 18-Dez-2024. Major protocol violations nao sao pagaveis.",
      isActive: true,
    },
  });

  console.log("Criando VisitTemplates (cronograma)...");
  // Cronograma de visitas conforme Section D do CTA Amendment
  const visitTemplatesData = [
    { code: "V1/SCR", name: "Screening Visit", weekOffset: -4, orderIndex: 1 },
    { code: "V2/W1", name: "Visit 2 / Week 1 (Baseline/Random)", weekOffset: 1, orderIndex: 2 },
    { code: "V3/W3", name: "Visit 3 / Week 3", weekOffset: 3, orderIndex: 3 },
    { code: "V4/W12", name: "Visit 4 / Week 12", weekOffset: 12, orderIndex: 4 },
    { code: "V5/W22-PC", name: "Visit 5 / Week 22 (Phone)", weekOffset: 22, isPhone: true, orderIndex: 5 },
    { code: "V6/W32", name: "Visit 6 / Week 32", weekOffset: 32, orderIndex: 6 },
    { code: "V7/W42-PC", name: "Visit 7 / Week 42 (Phone)", weekOffset: 42, isPhone: true, orderIndex: 7 },
    { code: "V8/W52", name: "Visit 8 / Week 52", weekOffset: 52, orderIndex: 8 },
    { code: "V9/W64-PC", name: "Visit 9 / Week 64 (Phone)", weekOffset: 64, isPhone: true, orderIndex: 9 },
    { code: "V10/W76", name: "Visit 10 / Week 76", weekOffset: 76, orderIndex: 10 },
    { code: "V11/W88-PC", name: "Visit 11 / Week 88 (Phone)", weekOffset: 88, isPhone: true, orderIndex: 11 },
    { code: "V12/W100", name: "Visit 12 / Week 100", weekOffset: 100, orderIndex: 12 },
    { code: "V13/W112-PC", name: "Visit 13 / Week 112 (Phone)", weekOffset: 112, isPhone: true, orderIndex: 13 },
    { code: "V14/W124", name: "Visit 14 / Week 124", weekOffset: 124, orderIndex: 14 },
    { code: "V15/W136-PC", name: "Visit 15 / Week 136 (Phone)", weekOffset: 136, isPhone: true, orderIndex: 15 },
    { code: "V16/W148", name: "Visit 16 / Week 148", weekOffset: 148, orderIndex: 16 },
    { code: "EoT", name: "End of Treatment", orderIndex: 17 },
    { code: "FU/EoS", name: "Follow-up / End of Study", orderIndex: 18 },
  ];

  const visitTemplates = await Promise.all(
    visitTemplatesData.map((v) =>
      prisma.visitTemplate.create({
        data: { ...v, studyId: study.id },
      })
    )
  );

  const vtByCode = Object.fromEntries(visitTemplates.map((v) => [v.code, v]));

  console.log("Criando BudgetItems - visitas regulares...");
  // Section D - Per Visit Schedule (USD com 35% overhead)
  const visitBudgets: Array<{ code: string; amount: number; isScreenFail?: boolean }> = [
    { code: "V1/SCR", amount: 1080 },
    { code: "V2/W1", amount: 1041 },
    { code: "V3/W3", amount: 674 },
    { code: "V4/W12", amount: 999 },
    { code: "V5/W22-PC", amount: 81 },
    { code: "V6/W32", amount: 872 },
    { code: "V7/W42-PC", amount: 81 },
    { code: "V8/W52", amount: 936 },
    { code: "V9/W64-PC", amount: 81 },
    { code: "V10/W76", amount: 802 },
    { code: "V11/W88-PC", amount: 81 },
    { code: "V12/W100", amount: 865 },
    { code: "V13/W112-PC", amount: 81 },
    { code: "V14/W124", amount: 802 },
    { code: "V15/W136-PC", amount: 81 },
    { code: "V16/W148", amount: 802 },
    { code: "EoT", amount: 1100 },
    { code: "FU/EoS", amount: 650 },
  ];

  for (const v of visitBudgets) {
    const tpl = vtByCode[v.code];
    await prisma.budgetItem.create({
      data: {
        contractVersionId: contract.id,
        visitTemplateId: tpl.id,
        name: tpl.name,
        kind: "VISIT",
        method: "PER_OCCURRENCE",
        unitAmount: v.amount,
        currency: "USD",
        autoTrigger: true,
        requiresInvoice: false,
      },
    });
  }

  // Screening Failure (mesmo valor da V1)
  await prisma.budgetItem.create({
    data: {
      contractVersionId: contract.id,
      name: "Screening Failure (mesmo valor da Screening Visit)",
      kind: "SCREEN_FAIL",
      method: "PER_OCCURRENCE",
      unitAmount: 1080,
      currency: "USD",
      autoTrigger: true,
    },
  });

  // Tipos extras de visita
  const extraVisitTypes = [
    { name: "Phone call visit (extra)", kind: "PHONE", amount: 81 },
    { name: "Virtual Visit (forca maior)", kind: "VIRTUAL", amount: 275 },
    { name: "Home Healthcare Visit (forca maior)", kind: "HOME", amount: 232 },
    { name: "Unscheduled Visit", kind: "UNSCHEDULED", amount: 457 },
  ];
  for (const e of extraVisitTypes) {
    await prisma.budgetItem.create({
      data: {
        contractVersionId: contract.id,
        name: e.name,
        kind: e.kind,
        method: "PER_OCCURRENCE",
        unitAmount: e.amount,
        currency: "USD",
      },
    });
  }

  console.log("Criando BudgetItems - subestudo de acelerometria...");
  const accelero = [
    { code: "V1/SCR", amount: 27 },
    { code: "V2/W1", amount: 53 },
    { code: "V4/W12", amount: 52 },
    { code: "V8/W52", amount: 52 },
  ];
  for (const a of accelero) {
    const tpl = vtByCode[a.code];
    await prisma.budgetItem.create({
      data: {
        contractVersionId: contract.id,
        visitTemplateId: tpl.id,
        name: `Subestudo Acelerometria - ${tpl.name}`,
        kind: "SUBSTUDY",
        method: "PER_OCCURRENCE",
        unitAmount: a.amount,
        currency: "USD",
      },
    });
  }

  console.log("Criando BudgetItems - itens fixos (Amount/Quantity)...");
  // Itens das imagens do Orcamento (One-time / Quantity)
  const oneTimeItems = [
    { name: "Non Refundable Start-Up", kind: "START_UP", method: "AMOUNT", amount: 1500 },
    { name: "Laboratory Start-up Fees", kind: "START_UP", method: "AMOUNT", amount: 400 },
    { name: "Document preparation fee for INITIAL submission", kind: "START_UP", method: "AMOUNT", amount: 292 },
    { name: "Pharmacy Set-up Fee", kind: "PHARMACY", method: "AMOUNT", amount: 500 },
    { name: "Pharmacy Storage Fees (one-time, qty 2)", kind: "PHARMACY", method: "QUANTITY", amount: 229, qty: 2 },
    { name: "Archiving Fee", kind: "CLOSE_OUT", method: "AMOUNT", amount: 1204 },
    { name: "Close Out Fees", kind: "CLOSE_OUT", method: "AMOUNT", amount: 702 },
    { name: "Pharmacy Close Out", kind: "CLOSE_OUT", method: "AMOUNT", amount: 500 },
    { name: "CHPS Submission Fee", kind: "OTHER", method: "PER_OCCURRENCE", amount: 22 },
    { name: "IRB Fees (As Incurred)", kind: "PASS_THROUGH", method: "AS_INCURRED", amount: 0, requiresInvoice: true },
    { name: "Lab Fees (As Incurred)", kind: "PASS_THROUGH", method: "AS_INCURRED", amount: 0, requiresInvoice: true },
  ];
  for (const o of oneTimeItems) {
    await prisma.budgetItem.create({
      data: {
        contractVersionId: contract.id,
        name: o.name,
        kind: o.kind,
        method: o.method,
        unitAmount: o.amount,
        defaultQuantity: o.qty ?? 1,
        currency: "USD",
        requiresInvoice: o.requiresInvoice ?? false,
      },
    });
  }

  console.log("Criando BudgetItems - procedimentos condicionais COM fatura (pass-through)...");
  // Section N - Conditional Procedures (with invoice)
  const passThrough = [
    { name: "Optional corticosteroid surveillance substudy consent", amount: 19 },
    { name: "Vital signs incl. weight - additional/repeat", amount: 34 },
    { name: "Echocardiography 2D complete (TTE) - extra", amount: 614 },
    { name: "Interpretation and Report - Echocardiography (TTE) - extra", amount: 254 },
    { name: "Blood draw / phlebotomy / venipuncture - additional", amount: 34 },
    { name: "Hematology (full panel local lab)", amount: 18 },
    { name: "Hematology - manual differential WBC count", amount: 15 },
    { name: "Hematology - hemoglobin (Hb) eligibility check", amount: 8 },
    { name: "Coagulation - aPTT", amount: 22 },
    { name: "Coagulation - PT (Prothrombin Time)", amount: 8 },
    { name: "Coagulation - INR", amount: 23 },
    { name: "Enzymes/Substrates/Electrolytes - full panel", amount: 61 },
    { name: "Electrolytes - Potassium (eligibility)", amount: 8 },
    { name: "Enzymes - ALT (eligibility)", amount: 11 },
    { name: "Enzymes - AST (eligibility)", amount: 14 },
    { name: "Enzymes - GGT (Glutamyl)", amount: 18 },
    { name: "Enzymes - Creatine Kinase (CK)", amount: 20 },
    { name: "Substrates - Uric Acid", amount: 9 },
    { name: "Enzymes - Amylase", amount: 14 },
    { name: "Enzymes - Lipase", amount: 38 },
    { name: "Substrates - HbA1C", amount: 34 },
    { name: "Substrates - Bilirubin direct", amount: 12 },
    { name: "Substrates - Cholesterol total", amount: 22 },
    { name: "Substrates - hsCRP", amount: 41 },
    { name: "eGFR CKD-EPI (creatinine + calc)", amount: 16 },
    { name: "Electrolytes - Phosphorus inorganic", amount: 8 },
    { name: "NT-proBNP (eligibility)", amount: 47 },
    { name: "FSH (gonadotropin)", amount: 39 },
    { name: "Urine collection (additional/repeat)", amount: 12 },
    { name: "Urinalysis incl. UACR (dipstick)", amount: 12 },
    { name: "PK sampling (central lab) - extra", amount: 23 },
    { name: "Specimen handling/transport to central lab (complex)", amount: 22 },
    { name: "Child-Pugh Classification", amount: 22 },
    { name: "Optional Trial Participant Feedback Questionnaire", amount: 7 },
    { name: "Optional Caregiver Feedback Questionnaire", amount: 7 },
    { name: "Pharmacy Simple dispense - unscheduled", amount: 18 },
    { name: "Daily Facility Charge Complex (PK overnight)", amount: 363 },
    { name: "Re-consent (ICF reassinada)", amount: 80 },
    { name: "Patient Meals", amount: 22 },
    { name: "Patient Travel", amount: 21 },
    { name: "Local Laboratory Fee", amount: 61 },
    { name: "Lab Handling Fee", amount: 22 },
    { name: "Blood Test (geral)", amount: 15 },
    { name: "Bilirubin total", amount: 12 },
    { name: "Cholesterol", amount: 22 },
    { name: "Contraceptives", amount: 25 },
    { name: "Hemoglobin", amount: 34 },
    { name: "Phosphorus", amount: 8 },
    { name: "Questionnaire (geral)", amount: 7 },
    { name: "Thromboplastin (Plasma/whole blood)", amount: 22 },
    { name: "Urine collection, prep, ship", amount: 12 },
    { name: "Vital Sign", amount: 34 },
    { name: "Glutamyl", amount: 18 },
    { name: "Creatine Kinase", amount: 20 },
    { name: "CSF Protein", amount: 41 },
    { name: "PK Sampling", amount: 23 },
  ];
  for (const p of passThrough) {
    await prisma.budgetItem.create({
      data: {
        contractVersionId: contract.id,
        name: p.name,
        kind: "PASS_THROUGH",
        method: "PER_OCCURRENCE",
        unitAmount: p.amount,
        currency: "USD",
        requiresInvoice: true,
        autoTrigger: false,
      },
    });
  }

  console.log("Criando BudgetItems - procedimentos condicionais SEM fatura (CRF data)...");
  // Section O - Conditional Procedures (without invoice / paid via CRF)
  const crfTriggered = [
    { name: "NYHA Functional Classification (during phone visit)", amount: 28 },
    { name: "Single 12-Lead ECG (extra/repeat ou cardiac symptoms)", amount: 63 },
    { name: "Cortisol total (local lab)", amount: 63 },
    { name: "ACTH stimulation test", amount: 193 },
    { name: "Pregnancy test - urine or serum (qualitative)", amount: 20 },
    { name: "Serious Adverse Event (SAE) - registro completo", amount: 97 },
  ];
  for (const c of crfTriggered) {
    await prisma.budgetItem.create({
      data: {
        contractVersionId: contract.id,
        name: c.name,
        kind: "CRF_TRIGGERED",
        method: "PER_OCCURRENCE",
        unitAmount: c.amount,
        currency: "USD",
        autoTrigger: true,
        requiresInvoice: false,
      },
    });
  }

  console.log("Criando 3 Subjects de exemplo...");
  const subjectsData = [
    {
      subjectCode: "1076014-001",
      status: "ACTIVE",
      enrolledAt: new Date("2025-09-05"),
      randomizedAt: new Date("2025-09-12"),
    },
    {
      subjectCode: "1076014-002",
      status: "ACTIVE",
      enrolledAt: new Date("2025-09-15"),
      randomizedAt: new Date("2025-09-22"),
    },
    {
      subjectCode: "1076014-003",
      status: "SCREEN_FAIL",
      enrolledAt: new Date("2025-10-02"),
    },
  ];

  const subjects = await Promise.all(
    subjectsData.map((s) =>
      prisma.subject.create({
        data: { ...s, studyId: study.id },
      })
    )
  );

  console.log("Registrando visitas concluidas e gerando BillableLines...");

  // helpers para gerar linha
  const overhead = 0; // CTA ja inclui overhead
  const holdbackPct = 10;

  async function emitLine(opts: {
    budgetItemName: string;
    subjectId?: string;
    subjectVisitId?: string;
    occurredAt: Date;
    quantity?: number;
    description?: string;
    invoiceRef?: string;
    status?: string;
  }) {
    const item = await prisma.budgetItem.findFirst({
      where: { contractVersionId: contract.id, name: opts.budgetItemName },
    });
    if (!item) {
      console.warn("BudgetItem nao encontrado:", opts.budgetItemName);
      return;
    }
    const qty = opts.quantity ?? item.defaultQuantity ?? 1;
    const gross = item.unitAmount * qty;
    const hold = +(gross * (holdbackPct / 100)).toFixed(2);
    const net = +(gross - hold).toFixed(2);
    await prisma.billableLine.create({
      data: {
        budgetItemId: item.id,
        subjectId: opts.subjectId,
        subjectVisitId: opts.subjectVisitId,
        occurredAt: opts.occurredAt,
        quantity: qty,
        grossAmount: gross,
        holdbackAmount: hold,
        netAmount: net,
        currency: "USD",
        status: opts.status ?? "READY",
        description: opts.description,
        invoiceRef: opts.invoiceRef,
      },
    });
  }

  // === Subject 001 - completou V1 + V2 + V3 + procedimentos extras ===
  const s1 = subjects[0];
  const s1Visits = [
    { code: "V1/SCR", date: new Date("2025-09-05"), name: "Screening Visit" },
    { code: "V2/W1", date: new Date("2025-09-12"), name: "Visit 2 / Week 1 (Baseline/Random)" },
    { code: "V3/W3", date: new Date("2025-09-26"), name: "Visit 3 / Week 3" },
  ];
  for (const v of s1Visits) {
    const tpl = vtByCode[v.code];
    const sv = await prisma.subjectVisit.create({
      data: {
        subjectId: s1.id,
        visitTemplateId: tpl.id,
        visitDate: v.date,
        status: "COMPLETED",
      },
    });
    await emitLine({
      budgetItemName: v.name,
      subjectId: s1.id,
      subjectVisitId: sv.id,
      occurredAt: v.date,
    });
  }
  // SAE registrado para subject 001
  await emitLine({
    budgetItemName: "Serious Adverse Event (SAE) - registro completo",
    subjectId: s1.id,
    occurredAt: new Date("2025-09-30"),
    description: "EAG: hospitalizacao por descompensacao de IC",
  });
  // Eco extra (pass-through, requer invoice anexa - segue como DRAFT)
  await emitLine({
    budgetItemName: "Echocardiography 2D complete (TTE) - extra",
    subjectId: s1.id,
    occurredAt: new Date("2025-09-30"),
    description: "Eco extra solicitado pelo PI apos sintomas",
    status: "DRAFT",
  });

  // === Subject 002 - completou V1 + V2 ===
  const s2 = subjects[1];
  const s2Visits = [
    { code: "V1/SCR", date: new Date("2025-09-15"), name: "Screening Visit" },
    { code: "V2/W1", date: new Date("2025-09-22"), name: "Visit 2 / Week 1 (Baseline/Random)" },
  ];
  for (const v of s2Visits) {
    const tpl = vtByCode[v.code];
    const sv = await prisma.subjectVisit.create({
      data: {
        subjectId: s2.id,
        visitTemplateId: tpl.id,
        visitDate: v.date,
        status: "COMPLETED",
      },
    });
    await emitLine({
      budgetItemName: v.name,
      subjectId: s2.id,
      subjectVisitId: sv.id,
      occurredAt: v.date,
    });
  }
  // ECG extra (CRF triggered)
  await emitLine({
    budgetItemName: "Single 12-Lead ECG (extra/repeat ou cardiac symptoms)",
    subjectId: s2.id,
    occurredAt: new Date("2025-09-25"),
    description: "ECG adicional por sintomas cardiacos",
  });

  // === Subject 003 - Screening failure ===
  const s3 = subjects[2];
  const tplScr = vtByCode["V1/SCR"];
  const sv3 = await prisma.subjectVisit.create({
    data: {
      subjectId: s3.id,
      visitTemplateId: tplScr.id,
      visitDate: new Date("2025-10-02"),
      status: "COMPLETED",
    },
  });
  await emitLine({
    budgetItemName: "Screening Failure (mesmo valor da Screening Visit)",
    subjectId: s3.id,
    subjectVisitId: sv3.id,
    occurredAt: new Date("2025-10-02"),
  });

  // Itens fixos do contrato (start-up ja realizados)
  await emitLine({
    budgetItemName: "Non Refundable Start-Up",
    occurredAt: new Date("2025-08-25"),
    description: "Pago apos assinatura do CTA Amendment",
  });
  await emitLine({
    budgetItemName: "Laboratory Start-up Fees",
    occurredAt: new Date("2025-08-25"),
  });
  await emitLine({
    budgetItemName: "Document preparation fee for INITIAL submission",
    occurredAt: new Date("2025-08-25"),
  });
  await emitLine({
    budgetItemName: "Pharmacy Set-up Fee",
    occurredAt: new Date("2025-08-25"),
  });
  await emitLine({
    budgetItemName: "Pharmacy Storage Fees (one-time, qty 2)",
    occurredAt: new Date("2025-08-25"),
    quantity: 2,
  });

  console.log("Criando Batch de exemplo (Setembro/2025)...");
  const batchSep = await prisma.batch.create({
    data: {
      studyId: study.id,
      batchNumber: "2025-09-001",
      referenceMonth: "2025-09",
      status: "DRAFT",
      currency: "USD",
    },
  });

  // Adiciona linhas de Setembro ao batch e atualiza totais
  const sepLines = await prisma.billableLine.findMany({
    where: {
      status: "READY",
      occurredAt: {
        gte: new Date("2025-09-01"),
        lt: new Date("2025-10-01"),
      },
    },
  });

  let totalGross = 0;
  let totalHold = 0;
  let totalNet = 0;
  for (const l of sepLines) {
    await prisma.billableLine.update({
      where: { id: l.id },
      data: { batchId: batchSep.id, status: "IN_BATCH" },
    });
    totalGross += l.grossAmount;
    totalHold += l.holdbackAmount;
    totalNet += l.netAmount;
  }
  await prisma.batch.update({
    where: { id: batchSep.id },
    data: {
      totalGross: +totalGross.toFixed(2),
      totalHoldback: +totalHold.toFixed(2),
      totalNet: +totalNet.toFixed(2),
    },
  });

  console.log("\nSeed concluido com sucesso.");
  console.log("Resumo:");
  console.log(`  Sponsor:       ${sponsor.name}`);
  console.log(`  CRO:           ${cro.name}`);
  console.log(`  Study:         ${study.protocolNumber} - ${study.shortTitle}`);
  console.log(`  Contrato:      ${contract.versionLabel}`);
  console.log(`  VisitTemplates: ${visitTemplates.length}`);
  console.log(`  BudgetItems:   ${await prisma.budgetItem.count()}`);
  console.log(`  Subjects:      ${subjects.length}`);
  console.log(`  BillableLines: ${await prisma.billableLine.count()}`);
  console.log(`  Batches:       ${await prisma.batch.count()}`);
  console.log(`  Total bruto Set/2025 (USD): ${totalGross.toFixed(2)}`);
  console.log(`  Holdback retido (USD):       ${totalHold.toFixed(2)}`);
  console.log(`  Total liquido a receber:     ${totalNet.toFixed(2)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
