# Cardiolab Trials

Software de gestão de pesquisa clínica do Cardresearch (Cardiolab).
Primeiro módulo: **Faturamento de pesquisa clínica**.

> Versão MVP (v0.1.0) — pré-piloto interno. Stack: Next.js 15 + TypeScript + Prisma + SQLite (dev). PostgreSQL será usado em produção.

## Como rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Criar/atualizar banco SQLite e gerar Prisma Client
npm run db:push

# 3. Popular com dados reais do CTA BI 1378-0020 (EASi-HF Preserved)
npm run db:seed

# 4. Subir o servidor de desenvolvimento
npm run dev

# Abrir em http://localhost:3000
```

Para resetar tudo (recriar banco + reimportar seed):

```bash
rm prisma/dev.db && npm run db:push && npm run db:seed
```

Para abrir o Prisma Studio (visualização das tabelas):

```bash
npm run db:studio
```

## O que ja vem no MVP

### Modelo de dados (`prisma/schema.prisma`)
- `Sponsor`, `Cro`, `Study`
- `ContractVersion` (versionado, com overhead e holdback configuráveis)
- `BudgetItem` (catálogo de itens faturáveis — visita, pass-through, CRF auto, start-up, close-out, subestudo, farmácia, outros)
- `VisitTemplate` (cronograma do protocolo)
- `Subject`, `SubjectVisit`
- `BillableLine` (motor de faturamento — bruto, holdback, líquido, status)
- `Batch` (lote/fatura)
- `AuditLog` (trilha imutável)

### Telas
- `/` — Dashboard com KPIs (faturado, holdback, a receber, recebido) e linhas recentes
- `/pesquisas` e `/pesquisas/[id]` — Lista e detalhe do estudo (cronograma + versões de contrato)
- `/orcamento` — Catálogo de itens contratados, com filtro por tipo. Mostra o orçamento real do CTA carregado (100 itens da BI 1378-0020)
- `/pacientes` e `/pacientes/[id]` — Lista de participantes, visitas e lançamentos por paciente
- `/visitas` — Visão cronológica de visitas realizadas
- `/lancamentos` — Todas as `BillableLines` com filtro por status
- `/lotes` e `/lotes/[id]` — Lotes de cobrança. Permite **gerar novo lote com itens pendentes** e **marcar lote como pago** (propaga para todas as linhas)
- `/checklist` — Checklist de negociação de CTA (8 categorias, 60+ itens)

### Dados pré-carregados
- Sponsor: Boehringer Ingelheim
- CRO: IQVIA RDS Inc.
- Study: 1378-0020 — EASi-HF Preserved (Fase III, IC com FEVE ≥ 40%)
- Contrato: v2 (Amendment 1, vigente 21/Ago/2025), USD com 35% overhead, 90/10 hold
- 18 visitas (V1..V16 + EoT + FU)
- 100 itens faturáveis (visitas, screening fail, virtuais, telefone, domiciliar, unscheduled, subestudo acelerometria, start-up, close-out, farmácia, 50+ pass-through, 6 CRF-triggered)
- 3 pacientes de exemplo
- 14 `BillableLines`
- 1 lote (Setembro/2025): bruto USD 5.076,00 / holdback 507,60 / líquido 4.568,40

## Migracao para Postgres (produção)

1. Provisionar instância (RDS/Render/Supabase em São Paulo, LGPD).
2. Trocar provider em `prisma/schema.prisma` para `postgresql`.
3. Atualizar `DATABASE_URL` em `.env`.
4. Rodar `prisma migrate deploy`.

## Roadmap próximas sprints

- Cadastros via UI (hoje só via seed/Prisma Studio)
- Importação de orçamento por planilha (Excel/CSV)
- Comparação visual entre versões de contrato (diff entre v1 e v2)
- Exportação de invoice/lote em PDF
- Autenticação com perfis (PI, Coordenador, Financeiro, Admin)
- Integração com EDC (gatilho automático via webhook)
- Integração contábil (export para Conta Azul/Omie/QuickBooks)
- Módulo de gestão de pacientes (regulatório, EAs, comunicações, etc.)

## Referências usadas no design

- SCRS — Site Invoiceables Toolkit (2022)
- SOCRA — Budget Development and Negotiation for Investigative Sites
- Medidata CTFM, Veeva Payments, IQVIA Financial Suite, SiteCentric CTMS, Clinical.ly Finance (benchmark)
- LGPD (Lei 13.709/2018), 21 CFR Part 11, ICH-GCP
