# Ajustes Front-end — Tasks

**Plano:** `plans/alteracoes_front.md`
**Status:** Draft

---

## Contexto Técnico

| Item | Detalhe |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript |
| DB | Drizzle ORM + Postgres (Supabase) |
| Storage | Supabase Storage, bucket `documents` |
| UI | shadcn/ui + Tailwind |
| Charts | Recharts ^3.8.1 (já instalado) |
| Icons | lucide-react ^1.8.0 (já instalado) |
| Schema | `src/db/schema.ts` — enums: `documentTypeEnum` já tem `investment_statement` |

**Sem suite de testes configurada** → `Tests: none` em todas as tasks; gate = build TypeScript (`npx tsc --noEmit`).

---

## Execution Plan

### Phase 1 — Foundation (Parallel)

Todas independentes entre si. Podem rodar simultaneamente.

```
T1 ─┐
T2 ─┤
T5 ─┼──→ Phase 2
T8 ─┤
T11─┤
T14─┘
```

### Phase 2 — Core Components (Parallel)

Cada task depende de exatamente uma task da Phase 1.

```
T1 ──→ T3 ─┐
T2 ──→ T3  │
T5 ──→ T6 ─┤
T5 ──→ T7 ─┼──→ Phase 3
T8 ──→ T9 ─┤
T11 ─→ T12─┤
T11 ─→ T13─┘
```

### Phase 3 — Integration (Parallel onde possível)

```
T1+T3 ──→ T4 ─┐
T9    ──→ T10  │──→ Phase 4
T12+T13+T14 → T15─┘
```

### Phase 4 — Final Wiring (Sequential)

```
T15 ──→ T16
```

---

## Task Breakdown

### T1: Fix upload route — error handling + suporte a campo `type` [P]

**What:** Adicionar try/catch nas operações de DB (`db.select`, `db.insert`) e ler/validar `formData.get("type")` para suportar os dois tipos de documento.
**Where:** `src/app/api/upload/route.ts`
**Depends on:** None
**Reuses:** Schema `documentTypeEnum` (`"credit_card_statement" | "investment_statement"`)

**Tools:**
- MCP: NONE
- Skill: NONE

**Done when:**
- [ ] `db.select()` e `db.insert()` envolvidos em try/catch com `console.error` e retorno 500 informativo
- [ ] `formData.get("type")` lido; valores válidos: `"credit_card_statement"` e `"investment_statement"`; default `"credit_card_statement"` quando ausente
- [ ] Tipo inválido retorna `{ error: "invalid_document_type" }` com status 400
- [ ] Campo `type` usado no `db.insert(...).values({ type: docType, ... })`
- [ ] `npx tsc --noEmit` passa sem erros

**Tests:** none
**Gate:** build
**Commit:** `fix(upload): add error handling and document type field support`

---

### T2: Adicionar prop `documentType` ao Dropzone [P]

**What:** Adicionar prop opcional `documentType: "credit_card_statement" | "investment_statement"` ao componente Dropzone e incluí-la no `formData.append` antes de fazer o POST.
**Where:** `src/components/upload/dropzone.tsx`
**Depends on:** None
**Reuses:** Interface `DropzoneProps` existente

**Tools:**
- MCP: NONE
- Skill: NONE

**Done when:**
- [ ] Interface `DropzoneProps` tem `documentType?: "credit_card_statement" | "investment_statement"` (default `"credit_card_statement"`)
- [ ] `handleUpload` faz `formData.append("type", documentType)` antes do fetch
- [ ] Texto do botão de envio muda conforme o tipo: faturas → "Enviar fatura", investimentos → "Enviar extrato"
- [ ] `npx tsc --noEmit` passa sem erros

**Tests:** none
**Gate:** build
**Commit:** `feat(dropzone): add documentType prop`

---

### T5: Trocar link "Cartões" por "Investimentos" no AppHeader [P]

**What:** Substituir o `<Link href="/cartoes">` por `<Link href="/investimentos">` no componente de navegação.
**Where:** `src/components/dashboard/app-header.tsx`
**Depends on:** None
**Reuses:** Padrão de Link existente no mesmo arquivo

**Tools:**
- MCP: NONE
- Skill: NONE

**Done when:**
- [ ] Link `href="/cartoes"` removido
- [ ] Link `href="/investimentos"` adicionado com texto "Investimentos"
- [ ] Ordem na nav mantida (Dashboard → Investimentos → Upload → Transacoes)
- [ ] `npx tsc --noEmit` passa sem erros

**Tests:** none
**Gate:** build
**Commit:** `feat(nav): replace Cartoes with Investimentos link`

---

### T8: Criar componente `TransactionTable` [P]

**What:** Criar table component client-side que recebe lista de transações e prop `visible: boolean`. Quando `visible=false`, mascara valores e descrições.
**Where:** `src/components/transactions/transaction-table.tsx` (novo arquivo)
**Depends on:** None
**Reuses:** shadcn `<Table>` (`src/components/ui/table.tsx`), `<Badge>` para categoria

**Tools:**
- MCP: NONE
- Skill: NONE

**Done when:**
- [ ] Props: `transactions: Transaction[]`, `visible: boolean`
- [ ] Tipo `Transaction` definido inline: `{ id, description, amount, txnDate, category, cardId? }`
- [ ] Quando `visible=false`: `amount` → `"R$ •••,••"`, `description` → `"••••••••"`
- [ ] Quando `visible=true`: `amount` formatado em `pt-BR` (`Intl.NumberFormat`), `description` normal
- [ ] `category` renderizada como `<Badge>` com cores: necessario=emerald, superfluo=amber, investimento=blue
- [ ] `txnDate` formatada em pt-BR (`dd/MM/yyyy`)
- [ ] Coluna de cabeçalhos: Data, Descrição, Categoria, Valor
- [ ] `npx tsc --noEmit` passa sem erros

**Tests:** none
**Gate:** build
**Commit:** `feat(transactions): create TransactionTable with masking`

---

### T11: Adicionar `resolveCardColor` a utils.ts [P]

**What:** Adicionar função utilitária que resolve a cor de exibição de um cartão baseada no `bankCode`.
**Where:** `src/lib/utils.ts`
**Depends on:** None

**Tools:**
- MCP: NONE
- Skill: NONE

**Done when:**
- [ ] Função exportada com assinatura: `function resolveCardColor(card: { bankCode: string; color: string }): string`
- [ ] `bankCode.toLowerCase() === "inter"` → retorna `"#EC811D"`
- [ ] `bankCode.toLowerCase() === "nubank"` → retorna `"#800ACE"`
- [ ] Outros → retorna `card.color`
- [ ] `npx tsc --noEmit` passa sem erros

**Tests:** none
**Gate:** build
**Commit:** `feat(utils): add resolveCardColor utility`

---

### T14: Criar `CategoryDistributionChart` [P]

**What:** Criar componente Recharts de distribuição por categoria (PieChart ou BarChart) que mostra breakdown necessario/superfluo/investimento.
**Where:** `src/components/dashboard/charts/category-distribution-chart.tsx` (novo arquivo)
**Depends on:** None
**Reuses:** Recharts já instalado

**Tools:**
- MCP: NONE
- Skill: NONE

**Done when:**
- [ ] Props: `data: { necessario: number; superfluo: number; investimento: number }`
- [ ] Quando todos valores são 0: exibe mensagem `"Sem dados para exibir"`
- [ ] PieChart com `Cell` coloridos: necessario=`#10b981` (emerald), superfluo=`#f59e0b` (amber), investimento=`#3b82f6` (blue)
- [ ] `Tooltip` com formatter em `pt-BR` (R$)
- [ ] Componente marcado com `"use client"`
- [ ] `npx tsc --noEmit` passa sem erros

**Tests:** none
**Gate:** build
**Commit:** `feat(dashboard): create CategoryDistributionChart`

---

### T3: Atualizar `UploadSection` com prop `documentType` [P]

**What:** Adicionar prop `documentType` ao UploadSection, passar para Dropzone e filtrar a lista de documentos exibida pelo tipo.
**Where:** `src/components/upload/upload-section.tsx`
**Depends on:** T2 (Dropzone atualizado)
**Reuses:** Interface de `documents` existente, componente `DocumentList`

**Tools:**
- MCP: NONE
- Skill: NONE

**Done when:**
- [ ] Interface `UploadSectionProps` tem `documentType: "credit_card_statement" | "investment_statement"` e `title: string`
- [ ] `<Dropzone>` recebe `documentType`
- [ ] `documents` prop filtrada localmente por `documentType` antes de passar ao `<DocumentList>`
- [ ] `<h3>` de título renderiza a prop `title`
- [ ] `npx tsc --noEmit` passa sem erros

**Tests:** none
**Gate:** build
**Commit:** `feat(upload-section): add documentType filtering`

---

### T6: Criar página `/investimentos` com placeholders [P]

**What:** Criar page component com dropdown Todos/Brasileiro/Estrangeiro, 3 cards de métricas zeradas (Taxa Selic, Ganhos/Perdas, Crescimento patrimonial) e 2 gráficos placeholder.
**Where:** `src/app/(auth)/investimentos/page.tsx` (novo arquivo)
**Depends on:** T5 (nav atualizada aponta para esta rota)
**Reuses:** shadcn `<Card>`, `<Select>` (`src/components/ui/select.tsx`, `src/components/ui/card.tsx`)

**Tools:**
- MCP: NONE
- Skill: NONE

**Done when:**
- [ ] Page é server component (sem `"use client"`)
- [ ] `<Select>` com opções: "Todos", "Brasileiro", "Estrangeiro" (estático, sem lógica por enquanto)
- [ ] 3 `<Card>` com valores `"—"` ou `"0%"`: Taxa Selic, Ganhos/Perdas (R$ 0,00), Crescimento patrimonial (0,00 / 0%)
- [ ] 2 placeholders de gráfico: "Evolução do patrimônio" e "Alocação de ativos" com mensagem orientando upload
- [ ] Texto de orientação: `"Faça upload de extratos de investimento para ver seus dados"`
- [ ] `npx tsc --noEmit` passa sem erros

**Tests:** none
**Gate:** build
**Commit:** `feat(investimentos): create placeholder page`

---

### T7: Redirecionar `/cartoes` para `/dashboard` [P]

**What:** Substituir o conteúdo de `cartoes/page.tsx` por um redirect permanente para `/dashboard`.
**Where:** `src/app/(auth)/cartoes/page.tsx`
**Depends on:** T5 (link da nav removido; rota legada precisa redirecionar)
**Reuses:** `redirect` do Next.js

**Tools:**
- MCP: NONE
- Skill: NONE

**Done when:**
- [ ] Importa e chama `redirect("/dashboard")` do `"next/navigation"`
- [ ] Componente não renderiza nada (o redirect ocorre server-side)
- [ ] Todo código anterior (useState, fetch, CardList) removido
- [ ] `npx tsc --noEmit` passa sem erros

**Tests:** none
**Gate:** build
**Commit:** `feat(cartoes): redirect legacy route to dashboard`

---

### T9: Criar componente `TransactionsView` [P]

**What:** Criar wrapper client component com botão Eye/EyeOff que controla `visible` state e renderiza `TransactionTable`.
**Where:** `src/components/transactions/transactions-view.tsx` (novo arquivo)
**Depends on:** T8 (TransactionTable)
**Reuses:** `Eye`, `EyeOff` de `lucide-react`; `<Button>` de shadcn

**Tools:**
- MCP: NONE
- Skill: NONE

**Done when:**
- [ ] Marcado com `"use client"`
- [ ] Props: `transactions: Transaction[]` (mesmo tipo de T8)
- [ ] Estado inicial `visible = false` (mascarado por padrão)
- [ ] Botão no header da seção alterna entre `<Eye>` e `<EyeOff>` + tooltip "Mostrar valores" / "Ocultar valores"
- [ ] Passa `transactions` e `visible` para `<TransactionTable>`
- [ ] Quando `transactions.length === 0`: exibe mensagem `"Nenhuma transação encontrada. Faça upload de uma fatura primeiro."`
- [ ] `npx tsc --noEmit` passa sem erros

**Tests:** none
**Gate:** build
**Commit:** `feat(transactions): create TransactionsView with hide/show toggle`

---

### T12: Criar componente `CardSelector` [P]

**What:** Criar dropdown selector com opção "Todos" + cada cartão do usuário, exibindo dot colorido via `resolveCardColor`.
**Where:** `src/components/dashboard/card-selector.tsx` (novo arquivo)
**Depends on:** T11 (resolveCardColor)
**Reuses:** shadcn `<Select>`, `resolveCardColor` de `src/lib/utils.ts`

**Tools:**
- MCP: NONE
- Skill: NONE

**Done when:**
- [ ] Marcado com `"use client"`
- [ ] Props: `cards: Array<{ id: string; name: string; bankCode: string; color: string }>`, `value: string`, `onChange: (cardId: string) => void`
- [ ] Opção "Todos" com value `"all"`
- [ ] Cada cartão como `<SelectItem>` com dot `<span>` colorido (via `resolveCardColor`) ao lado do nome
- [ ] `npx tsc --noEmit` passa sem erros

**Tests:** none
**Gate:** build
**Commit:** `feat(dashboard): create CardSelector component`

---

### T13: Criar `MonthlyEvolutionChart` [P]

**What:** Criar LineChart Recharts com uma linha por cartão (quando "Todos") ou linha única (por cartão selecionado), usando `resolveCardColor` para as cores.
**Where:** `src/components/dashboard/charts/monthly-evolution-chart.tsx` (novo arquivo)
**Depends on:** T11 (resolveCardColor)
**Reuses:** Recharts, `resolveCardColor`

**Tools:**
- MCP: NONE
- Skill: NONE

**Done when:**
- [ ] Marcado com `"use client"`
- [ ] Props: `data: Array<{ month: string; [cardId: string]: number | string }>`, `cards: Array<{ id: string; name: string; bankCode: string; color: string }>`
- [ ] Quando `data.length === 0`: exibe `"Sem dados para exibir"`
- [ ] `LineChart` com `ResponsiveContainer` height 256px
- [ ] Uma `<Line>` por cartão, stroke via `resolveCardColor`
- [ ] `XAxis` com `dataKey="month"`, `Tooltip` com formatter pt-BR (R$)
- [ ] `npx tsc --noEmit` passa sem erros

**Tests:** none
**Gate:** build
**Commit:** `feat(dashboard): create MonthlyEvolutionChart`

---

### T4: Atualizar upload/page.tsx com duas áreas de upload

**What:** Substituir conteúdo da upload page por dois `<UploadSection>`: um para faturas e outro para extratos de investimento.
**Where:** `src/app/(auth)/upload/page.tsx`
**Depends on:** T1 (route suporta campo `type`), T3 (UploadSection tem `documentType`)
**Reuses:** `<UploadSection>`, Drizzle para buscar documentos separados por tipo

**Tools:**
- MCP: NONE
- Skill: NONE

**Done when:**
- [ ] Page é server component (async)
- [ ] Busca documentos do usuário autenticado via Drizzle, separados: `type = "credit_card_statement"` e `type = "investment_statement"`
- [ ] Renderiza `<UploadSection title="Faturas de Cartão" documentType="credit_card_statement" documents={faturas} />`
- [ ] Renderiza `<UploadSection title="Extratos de Investimento" documentType="investment_statement" documents={investimentos} />`
- [ ] Usuário não autenticado redireciona para `/login`
- [ ] `npx tsc --noEmit` passa sem erros

**Tests:** none
**Gate:** build
**Commit:** `feat(upload): split upload page into two sections`

---

### T10: Atualizar transactions/page.tsx para buscar dados e usar TransactionsView

**What:** Converter a page de placeholder para server component que busca transações do usuário e passa para `<TransactionsView>`.
**Where:** `src/app/(auth)/transactions/page.tsx`
**Depends on:** T9 (TransactionsView)
**Reuses:** `db`, `transactions`, `cards` do schema Drizzle

**Tools:**
- MCP: NONE
- Skill: NONE

**Done when:**
- [ ] Page é server component (async, sem `"use client"`)
- [ ] Busca usuário via `createClient()` do Supabase server; redireciona para `/login` se não autenticado
- [ ] Query Drizzle: `db.select().from(transactions).where(eq(transactions.userId, user.id)).orderBy(desc(transactions.txnDate)).limit(100)`
- [ ] Mapeia resultado para o tipo `Transaction` esperado por `TransactionsView`
- [ ] Renderiza `<TransactionsView transactions={txList} />`
- [ ] `npx tsc --noEmit` passa sem erros

**Tests:** none
**Gate:** build
**Commit:** `feat(transactions): fetch real data and wire TransactionsView`

---

### T15: Criar `DashboardClient` — integração completa

**What:** Criar client component que orquestra `CardSelector`, métricas calculadas, `MonthlyEvolutionChart`, `CategoryDistributionChart` e `CardList`.
**Where:** `src/components/dashboard/dashboard-client.tsx` (novo arquivo)
**Depends on:** T12 (CardSelector), T13 (MonthlyEvolutionChart), T14 (CategoryDistributionChart)
**Reuses:** shadcn `<Card>`, `<CardList>` de `src/components/cards/card-list.tsx`

**Tools:**
- MCP: NONE
- Skill: NONE

**Done when:**
- [ ] Marcado com `"use client"`
- [ ] Props: `cards: CardItem[]`, `transactions: TransactionItem[]`
  - `CardItem`: `{ id, name, bankCode, color }`
  - `TransactionItem`: `{ id, cardId, amount, category, referenceMonth }`
- [ ] Estado `selectedCardId: string` (default `"all"`)
- [ ] Filtra `transactions` por `cardId` quando `selectedCardId !== "all"`
- [ ] Calcula métricas das transações filtradas: total, necessario, superfluo, investimento (soma de `amount` por categoria)
- [ ] Constrói `chartData` para `MonthlyEvolutionChart`: agrupa por `referenceMonth` e `cardId`
- [ ] Constrói `categoryData` para `CategoryDistributionChart` a partir das transações filtradas
- [ ] Seção de gestão de cartões: renderiza `<CardList>` com `cards` e `onRefresh` que chama `router.refresh()`
- [ ] Formata valores em pt-BR (`Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`)
- [ ] `npx tsc --noEmit` passa sem erros

**Tests:** none
**Gate:** build
**Commit:** `feat(dashboard): create DashboardClient with card filter and charts`

---

### T16: Atualizar dashboard/page.tsx para buscar dados e usar DashboardClient

**What:** Converter dashboard page de placeholder para server component que busca cartões e transações do usuário e passa para `<DashboardClient>`.
**Where:** `src/app/(auth)/dashboard/page.tsx`
**Depends on:** T15 (DashboardClient)
**Reuses:** `db`, `cards`, `transactions` do schema; `createClient` Supabase server

**Tools:**
- MCP: NONE
- Skill: NONE

**Done when:**
- [ ] Page é server component (async)
- [ ] Busca usuário via `createClient()`; redireciona para `/login` se não autenticado
- [ ] Busca `cards` do usuário: `db.select().from(cards).where(eq(cards.userId, user.id))`
- [ ] Busca `transactions` do usuário (últimos 6 meses): `where(and(eq(...), gte(referenceMonth, sixMonthsAgo)))`
- [ ] Remove todo o JSX placeholder atual
- [ ] Renderiza `<DashboardClient cards={cardList} transactions={txList} />`
- [ ] `npx tsc --noEmit` passa sem erros

**Tests:** none
**Gate:** build
**Commit:** `feat(dashboard): wire server data to DashboardClient`

---

## Parallel Execution Map

```
Phase 1 (todos paralelos — sem dependências entre si):
  T1 [P] — fix upload route
  T2 [P] — dropzone documentType prop
  T5 [P] — nav header update
  T8 [P] — TransactionTable component
  T11[P] — resolveCardColor util
  T14[P] — CategoryDistributionChart

Phase 2 (paralelos após Phase 1):
  T1+T2 → T3 [P] — UploadSection documentType
  T5    → T6 [P] — /investimentos page
  T5    → T7 [P] — /cartoes redirect
  T8    → T9 [P] — TransactionsView
  T11   → T12[P] — CardSelector
  T11   → T13[P] — MonthlyEvolutionChart

Phase 3 (paralelos após Phase 2):
  T1+T3        → T4  — upload/page.tsx duas áreas
  T9           → T10 — transactions/page.tsx
  T12+T13+T14  → T15 — DashboardClient

Phase 4 (sequential):
  T15 → T16 — dashboard/page.tsx
```

---

## Granularity Check

| Task | Escopo | Status |
|---|---|---|
| T1: Fix upload route | 1 arquivo, 2 mudanças coesas (try/catch + type field) | ✅ Granular |
| T2: Dropzone documentType | 1 componente | ✅ Granular |
| T3: UploadSection documentType | 1 componente | ✅ Granular |
| T4: Upload page duas áreas | 1 page file | ✅ Granular |
| T5: Nav header update | 1 componente | ✅ Granular |
| T6: /investimentos page | 1 page file | ✅ Granular |
| T7: /cartoes redirect | 1 file, 1 linha | ✅ Granular |
| T8: TransactionTable | 1 componente | ✅ Granular |
| T9: TransactionsView | 1 componente | ✅ Granular |
| T10: transactions/page.tsx | 1 page file | ✅ Granular |
| T11: resolveCardColor | 1 função | ✅ Granular |
| T12: CardSelector | 1 componente | ✅ Granular |
| T13: MonthlyEvolutionChart | 1 componente | ✅ Granular |
| T14: CategoryDistributionChart | 1 componente | ✅ Granular |
| T15: DashboardClient | 1 componente (orquestrador) | ✅ Granular |
| T16: dashboard/page.tsx | 1 page file | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Mostra | Status |
|---|---|---|---|
| T1 | None | Phase 1 raiz | ✅ |
| T2 | None | Phase 1 raiz | ✅ |
| T3 | T2 | T1+T2 → T3 | ✅ |
| T4 | T1, T3 | T1+T3 → T4 | ✅ |
| T5 | None | Phase 1 raiz | ✅ |
| T6 | T5 | T5 → T6 | ✅ |
| T7 | T5 | T5 → T7 | ✅ |
| T8 | None | Phase 1 raiz | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | T9 | T9 → T10 | ✅ |
| T11 | None | Phase 1 raiz | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T11 | T11 → T13 | ✅ |
| T14 | None | Phase 1 raiz | ✅ |
| T15 | T12, T13, T14 | T12+T13+T14 → T15 | ✅ |
| T16 | T15 | T15 → T16 | ✅ |

---

## Test Co-location Validation

Sem TESTING.md configurado no projeto. Todas as tasks usam `Tests: none` e gate de build (`npx tsc --noEmit`).

| Task | Camada | Matrix Requer | Task Diz | Status |
|---|---|---|---|---|
| Todas (T1–T16) | UI / API Route / Util | none (sem suite) | none | ✅ OK |
