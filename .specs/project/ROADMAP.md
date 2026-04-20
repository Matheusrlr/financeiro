# Roadmap — Financeiro

## Fase 1: Fundação + Paridade com MVP ✦ Prioridade máxima

> Reimplementar tudo que o MVP Python/Streamlit fazia, agora com stack moderna e deploy online.

| # | Feature | Descrição | Dependências |
|---|---------|-----------|-------------|
| 1.0 | **Setup do projeto** | Next.js + Supabase + Tailwind + shadcn/ui + Drizzle + CI básico | — |
| 1.1 | **Auth** | Login com magic link/Google, middleware de proteção, sessão | 1.0 |
| 1.2 | **Schema do banco** | Tabelas: cards, documents, transactions, insights_cache. RLS policies | 1.0 |
| 1.3 | **Gestão de cartões** | CRUD de cartões (nome, banco, cor). Seed inicial | 1.1, 1.2 |
| 1.4 | **Upload de PDF** | Drag & drop, storage no Supabase, dedup hash, detecção de tipo | 1.1, 1.2 |
| 1.5 | **Extração via IA** | Claude extrai transações do texto do PDF → JSON validado com Zod | 1.4 |
| 1.6 | **Categorização via IA** | Claude categoriza cada transação (necessario/superfluo/investimento) | 1.5 |
| 1.7 | **Dashboard** | Métricas, gráfico de barras (evolução mensal), donut (categorias), tabela com filtros | 1.3, 1.6 |
| 1.8 | **Insights com IA** | Consultoria mensal: resumo, comparação, vazamentos, dicas. Cache no banco | 1.7 |
| 1.9 | **Deploy no Vercel** | Variáveis de ambiente, domínio, preview deploys | 1.0–1.8 |

**Entregável:** App funcional online com login, upload de faturas, dashboard e insights.

---

## Fase 2: Investimentos

> Expandir para processar extratos de corretoras e consolidar visão patrimonial.

| # | Feature | Descrição | Dependências |
|---|---------|-----------|-------------|
| 2.1 | **Schema de investimentos** | Tabela investments, tipos de ativos, migrations | 1.2 |
| 2.2 | **Upload de extratos** | Suporte a PDFs de corretoras (XP, Rico, Clear, BTG) | 1.4, 2.1 |
| 2.3 | **Extração de investimentos** | Claude extrai: ativo, tipo, quantidade, valor, data | 2.2 |
| 2.4 | **Dashboard de investimentos** | Posição consolidada, evolução patrimonial, distribuição | 2.3 |
| 2.5 | **Visão unificada** | Gastos vs investimentos no dashboard principal | 1.7, 2.4 |
| 2.6 | **Insights cruzados** | "Se investisse o supérfluo, teria X em Y meses" | 1.8, 2.5 |

**Entregável:** Visão completa de gastos + investimentos com insights cruzados.

---

## Fase 3: Refinamentos e Qualidade de Vida

| # | Feature | Descrição |
|---|---------|-----------|
| 3.1 | **Categorias customizáveis** | Subcategorias criadas pelo usuário, IA aprende com overrides |
| 3.2 | **Metas financeiras** | Meta de gasto e investimento mensal, alertas |
| 3.3 | **Exportação** | CSV, Excel, relatório PDF mensal |
| 3.4 | **Notificações** | Email mensal com resumo, alerta de meta |
| 3.5 | **PWA** | App installável no celular |

---

## Milestone atual: **Fase 1 — Auth + Schema + Cards + Upload (1.1–1.4)**

### Status das features em andamento

| Feature | Spec | Complexidade | Status |
|---------|------|-------------|--------|
| 1.1 Auth com Supabase real | `.specs/features/1.1-auth-test/spec.md` | Small | Pending |
| 1.2 Schema + RLS + db:push | `.specs/features/1.2-db-push/spec.md` | Small | Pending |
| 1.3 CRUD de cartões | `.specs/features/1.3-cards-crud/spec.md` | Large | Pending |
| 1.4 Upload de PDF + Storage | `.specs/features/1.4-pdf-upload/spec.md` | Large | Pending |
