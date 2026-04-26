# Plano: Importação e Visualização de Relatórios de Rentabilidade

## Contexto

A aba `Investimentos` ([src/app/(auth)/investimentos/page.tsx](src/app/(auth)/investimentos/page.tsx)) hoje é um esqueleto: cartões de KPI estáticos e dois espaços vazios para gráficos. O usuário quer enviar relatórios mensais consolidados emitidos pelos seus bancos (começando pelo Inter Prime) e ver, na própria página de investimentos, indicadores, alocação e desempenho da carteira ao longo do tempo.

O parser de PDFs já existe para faturas de cartão ([src/lib/parsers/](src/lib/parsers/)), mas relatórios de investimento têm estrutura completamente diferente — snapshot + séries temporais + holdings, não uma lista plana de transações. Por isso não cabe na tabela `transactions` existente; precisa de novo modelo de dados, novo parser e nova camada de visualização.

A solução é projetada para ser extensível: hoje só Inter, no futuro outras corretoras (XP, BTG, etc.). A visão padrão será consolidada (todas as contas somadas), com filtro por conta.

## Decisões de design

- **Granularidade**: extração completa — todos os ~55 ativos individuais por relatório, mais KPIs e séries históricas.
- **Backfill**: na primeira ingestão, a tabela "Rentabilidades Mensais da Carteira" (desde jan/2021) e o histórico de 6 meses de alocação são lidos e populados.
- **Modelo de conta**: nova entidade `investment_accounts` paralela à `cards`. Pré-seed automático de "Inter Prime" no primeiro upload.
- **Visão multi-banco**: dashboard consolida tudo por padrão; filtro permite isolar uma conta.
- **Gráficos no v1**: wealth charts, allocation visuals, holdings detail e risk & liquidity extras (todos os bundles).
- **Re-upload do mesmo mês**: rejeitado com 409; usuário precisa apagar o anterior antes (UI deixa claro).

## Arquitetura

```
PDF → /api/upload (mantém)
        └─ /api/process/[id]  (passa a despachar por document.type)
              ├── credit_card_statement → parseDocument (existente)
              └── investment_statement  → parseInvestmentReportInter (novo)
                                                ↓
                                  insere em investment_reports (1 snapshot)
                                              + investment_holdings (~55)
                                              + investment_returns_history (~63 meses)
                                              + investment_allocation_history (6m × estratégias)
                                              + investment_events (movimentações + créditos)
                                              + investment_liquidity (7 buckets)
```

Frontend lê via novas queries Drizzle e renderiza com Recharts.

## 1. Schema do banco

Arquivo: [src/db/schema.ts](src/db/schema.ts)

Adicionar 7 tabelas:

| Tabela | Granularidade | Cardinalidade típica por upload |
|---|---|---|
| `investment_accounts` | conta | 1 (criada uma vez) |
| `investment_reports` | snapshot mensal | 1 |
| `investment_holdings` | ativo no snapshot | ~55 |
| `investment_returns_history` | mês × conta (Carteira % + CDI %) | ~63 (backfill 1ª vez), depois 1 |
| `investment_allocation_history` | mês × estratégia | 6 × ~9 (1ª vez), depois ~9 |
| `investment_events` | crédito/débito individual | ~5–15 |
| `investment_liquidity` | bucket × snapshot | 7 |

Constraints chave:
- `investment_reports`: `UNIQUE (userId, accountId, referenceMonth)` → enforça rejeição de duplicata.
- `investment_returns_history`: `UNIQUE (userId, accountId, referenceMonth)` → upsert idempotente (backfill convive com upload mensal).
- `investment_allocation_history`: `UNIQUE (userId, accountId, referenceMonth, strategy)` idem.
- `holdings/events/liquidity`: `ON DELETE CASCADE` a partir de `investment_reports`.

Campos numéricos: `numeric(14,2)` para valores (R$), `numeric(8,4)` para percentuais.

Migration: `npx drizzle-kit generate && npx drizzle-kit migrate`.

## 2. Parser do relatório Inter

Arquivo novo: [src/lib/parsers/investments/inter.ts](src/lib/parsers/investments/inter.ts)

Tipo de retorno (não cabe em `ParseResult`, que é específico para transações de cartão):

```ts
export interface ParsedInvestmentReport {
  bank: "inter";
  referenceMonth: string;          // "YYYY-MM"
  inceptionDate: string;           // "YYYY-MM-DD"
  summary: { patrimony; previousPatrimony; contributions; withdrawals;
             financialEvents; gainsMonth; returnMonthPct; returnYearPct;
             returnInceptionPct; totalContributed };
  allocationCurrent:  { strategy; pct }[];
  allocationHistory:  { referenceMonth; strategy; pct }[];     // 6 meses
  returnsHistory:     { referenceMonth; portfolioPct; cdiPct }[]; // desde 2021
  holdings:           { strategy; assetName; ticker?; previousBalance;
                        contributions; withdrawals; events; balance;
                        returnMonthPct; return12mPct; returnInceptionPct;
                        sharePct; isTaxExempt }[];
  events:             { eventDate; ticker?; eventType; amount }[];
  liquidity:          { bucket; amount; pct }[];
}

export function parseInvestmentReportInter(text: string): ParsedInvestmentReport
```

Pontos de atenção (extraídos da análise do PDF de março/2026):

- **Resumo**: linha `Patrimônio em DD/MM/YYYY` + `R$ X.XXX,XX`; linha seguinte `R$ X.XXX,XX em DD/MM/YYYY` = anterior. Mesmo padrão para `Aplicações no mês`, `Resgates`, `Eventos financeiros`, `Ganhos financeiros`, `Rentabilidade no mês/ano`, `Rentabilidade desde o início (DATA)`.
- **Tabela "Rentabilidades Mensais da Carteira (%)"**: linhas começando com `^20\d{2}` seguidas de 12 valores mensais + 2 totais; a linha seguinte com `% do CDI` traz a mesma sequência convertida (usar a tabela de Carteira para `portfolioPct` e derivar `cdiPct` por `portfolioPct / (% do CDI / 100)` quando `% do CDI > 0`, fallback para o agregado anual).
- **"Evolução de alocação de ativos"**: cabeçalho `Out/25 Nov/25 ... Mar/26`, linhas `<estratégia> <pct1> <pct2> ... <pct6>`.
- **Holdings**: blocos delimitados por subtítulos de estratégia (`Liquidez`, `Título Público`, `Pós-fixado`, `Inflação`, `Prefixado`, `Multimercado`, `Renda Variável`, `Global`, `COE`, `Outros`). Cada linha: `<nome> [Isento] <prev> <aplic> <resg> <event> <saldo> <%mês> <%12m> <%início> <%part>`. Tag `Isento` é detectável adjacente ao nome. Sub-totais e linha `Total` ignorados.
- **Movimentações no mês** (eventos): blocos de data em pt-BR (`9 de Março de 2026`), entradas com tipo (`Crédito Evento B3`, `Débito Renda Fixa`, `Resgate`, `Vencimento Eventos Rf`) e valor R$. Mapear para `eventType` canônico (`dividendo`, `jcp`, `rendimento`, `fração`, `vencimento`, `resgate`, `aplicação`).
- **Liquidez**: tabela `Análise da Disponibilidade Financeira` — linhas `<bucket> <valor> <pct> <acumulado> <pctAcum>`. Buckets canônicos: `0_1`, `2_5`, `6_15`, `16_30`, `31_90`, `91_180`, `more_180`.

Detecção do banco: em [src/lib/parsers/index.ts](src/lib/parsers/index.ts), adicionar branch `if (/Relatório Consolidado/i.test(text) && /interprime/i.test(text)) return "investment-inter"`. Manter contrato funcional puro.

## 3. Roteamento no processador

Arquivo: [src/app/api/process/[id]/route.ts](src/app/api/process/[id]/route.ts)

Trocar a chamada única `parseDocument(text)` por um switch sobre `document.type`:

```
if (document.type === "credit_card_statement") {
  // fluxo existente — insert em transactions
} else if (document.type === "investment_statement") {
  const parsed = parseInvestmentReportInter(pdfText);
  const accountId = document.metadata.accountId;

  // 1. Verificar duplicata: SELECT FROM investment_reports WHERE userId, accountId, referenceMonth=parsed.referenceMonth
  //    Se existir → UPDATE document.status='error', metadata.error='Mês já importado'; retornar 409.
  // 2. Em db.transaction:
  //      INSERT investment_reports → capturar reportId
  //      INSERT investment_holdings (bulk, com reportId)
  //      INSERT investment_returns_history (bulk, ON CONFLICT DO NOTHING)
  //      INSERT investment_allocation_history (bulk, ON CONFLICT DO NOTHING)
  //      INSERT investment_events (bulk)
  //      INSERT investment_liquidity (bulk)
  //      UPDATE document.status='completed'
}
```

`detectDocumentType()` em [src/lib/utils.ts:26-32](src/lib/utils.ts#L26-L32) já reconhece "rentabilidade" e "consolidado" no nome — manter, e como fallback aceitar a escolha explícita do usuário no upload.

## 4. Upload: tipo + conta de investimento

Arquivos: [src/components/upload/dropzone.tsx](src/components/upload/dropzone.tsx) e [src/app/api/upload/route.ts](src/app/api/upload/route.ts)

- Adicionar **seletor de tipo** (segmented control: `Cartão de crédito` / `Investimento`) acima do dropdown atual.
- Quando `Investimento`: dropdown lista `investment_accounts` no lugar de `cards`. Botão `+ nova conta` abre modal mínimo (nome + bankCode).
- O `documents.metadata` JSONB passa a guardar `{ accountId }` para investimento e `{ cardId }` para cartão (mutuamente exclusivos). Sem mudança de schema na tabela `documents`.
- Validação no `/api/upload`: tipo `investment_statement` exige `accountId`; tipo `credit_card_statement` exige `cardId` (regra atual).
- Pré-seed: se tipo for investimento e nenhuma conta existir, criar `Inter Prime` (bankCode `inter`) automaticamente — evita modal extra no caso comum.

[src/app/(auth)/upload/page.tsx](src/app/(auth)/upload/page.tsx) passa a buscar também `investmentAccounts` no SSR e passa ambas listas ao Dropzone.

## 5. Camada de queries

Arquivo novo: [src/lib/queries/investments.ts](src/lib/queries/investments.ts)

Funções tipadas (todas aceitam `accountIds?: string[]` — `undefined` = consolidado):

- `getKpisForMonth(userId, referenceMonth, accountIds?)` — patrimônio, ganhos, rent. mês/ano/inception, total aportado.
- `getReturnsHistory(userId, accountIds?)` — série mensal Carteira + CDI.
- `getPatrimonyHistory(userId, accountIds?)` — série mensal patrimônio + total aportado.
- `getCurrentAllocation(userId, referenceMonth, accountIds?)` — `{strategy, pct, value}[]`.
- `getAllocationHistory(userId, accountIds?, months=6)` — matriz mês × estratégia.
- `getHoldings(userId, referenceMonth, accountIds?)` — lista agrupada por estratégia.
- `getLiquidity(userId, referenceMonth, accountIds?)` — buckets.
- `getEventsTimeline(userId, accountIds?, months=24)` — série mensal valor + acumulado.

Quando `accountIds` agrega múltiplas contas, percentuais são re-ponderados pelo patrimônio (não simples média).

## 6. Dashboard de investimentos

Arquivo: [src/app/(auth)/investimentos/page.tsx](src/app/(auth)/investimentos/page.tsx) — rewrite.

Layout (vertical):

1. **Filtros**: `AccountFilter` (multi-select) + `MonthSelector` reaproveitado de [src/components/dashboard/month-selector.tsx](src/components/dashboard/month-selector.tsx).
2. **5 KPI cards**: Patrimônio · Ganhos no mês (delta abs + %) · Rent. mês vs CDI · Rent. ano vs CDI · Total aportado.
3. **Wealth charts** (grid 2 col):
   - `PatrimonyEvolutionChart` — `ComposedChart` Recharts, área "Total aportado" + linha "Patrimônio".
   - `ReturnsVsBenchmarksChart` — `BarChart` agrupado: Carteira / CDI / Ibovespa / IPCA × períodos (mês, ano, desde início).
4. **Allocation visuals** (grid 2 col):
   - `AllocationDonut` — `PieChart` (donut) por estratégia + legenda com R$ e %.
   - `AllocationEvolutionChart` — `BarChart` empilhado dos últimos 6 meses.
5. **Holdings table** — tabela shadcn agrupada por estratégia (collapsible), ordenável: Ativo · Saldo · Rent. mês % · Rent. 12m % · Desde início % · Part. %. Badge "Isento" quando aplicável.
6. **Risk & liquidity** — `Tabs` shadcn:
   - "Liquidez" → `LiquidityLadderChart` (horizontal stacked bar).
   - "Heatmap" → `MonthlyReturnsHeatmap` (grid customizado ano × mês, cor pela diferença vs CDI).
   - "Eventos" → `EventsTimelineChart` (`ComposedChart` barras valor + linha acumulada).

Componentes ficam em `src/components/investments/`. Reutilizar padrão de `ResponsiveContainer` + custom tooltip de [src/components/dashboard/charts/monthly-evolution-chart.tsx](src/components/dashboard/charts/monthly-evolution-chart.tsx). Cores por banco via novo `resolveBankColor(bankCode)` (sibling de `resolveCardColor` em [src/lib/utils.ts](src/lib/utils.ts)).

## Pontos abertos (não bloqueiam o v1)

- O PDF mostra Ibovespa e IPCA apenas em comparativos pontuais (mês, ano, desde início) — **não fornece série mensal completa**. No v1, gráfico "Returns vs benchmarks" usa Carteira × CDI na série temporal; Ibov/IPCA aparecem só nas barras agregadas dos 3 períodos.
- Heatmap mostra apenas meses fechados; mês corrente pode aparecer em branco se relatório ainda não foi importado.
- Detalhe de eventos individuais (ticker × tipo × valor) só existe para o mês corrente do relatório. Backfill histórico de eventos usa o gráfico "Histórico de eventos financeiros" como agregado mensal aproximado, sem detalhe por ticker.

## Ordem de execução

1. **Schema** — 7 tabelas em [src/db/schema.ts](src/db/schema.ts), gerar e aplicar migration.
2. **Parser** — `parseInvestmentReportInter` em [src/lib/parsers/investments/inter.ts](src/lib/parsers/investments/inter.ts) + atualizar `detectBank()` em [src/lib/parsers/index.ts](src/lib/parsers/index.ts).
3. **Pipeline** — ramificar [src/app/api/process/[id]/route.ts](src/app/api/process/[id]/route.ts) por `document.type`; tratar duplicata com 409. Pré-seed de conta no `/api/upload`.
4. **Upload UI + queries** — seletor de tipo no Dropzone, dropdown de contas, [src/lib/queries/investments.ts](src/lib/queries/investments.ts).
5. **Dashboard** — rewrite de [src/app/(auth)/investimentos/page.tsx](src/app/(auth)/investimentos/page.tsx) com os 4 bundles + tabela de holdings.

## Verificação

Upload do `pdfs/RelatorioRentabilidade.pdf` na conta "Inter Prime":

- `investment_reports`: 1 row, `patrimony = 266265.49`, `returnMonthPct ≈ 1.76`, `referenceMonth = "2026-03"`, `previousPatrimony = 266108.03`.
- `investment_holdings`: ~55 rows. Soma de `balance` = `patrimony` (tolerância R$ 0,01). Spot-check: `PETR4` com `balance = 12167.50`, `returnMonthPct = 24.98`, `sharePct = 4.57`. Linha `LCA ORIGINAL CDI 09/11/2026` com `isTaxExempt = true`.
- `investment_returns_history`: ~63 rows (jan/2021 → mar/2026), com `mar/2026` mostrando `portfolioPct = 1.76` e `cdiPct ≈ 1.21`.
- `investment_allocation_history`: 6 meses (Out/25 → Mar/26) × ~9 estratégias.
- `investment_liquidity`: 7 rows, soma de `amount` = `patrimony`.
- `investment_events`: ≥10 entradas do bloco "Movimentações no mês".

Re-upload do mesmo arquivo → API retorna 409 e UI mostra mensagem clara.

Dashboard:
- Filtro "todas as contas" e "Inter Prime" sozinha devem coincidir enquanto só houver Inter (sanity check de agregação).
- KPIs batem com a página "Resumo" do PDF.
- Donut "Alocação por Estratégia" reproduz exatamente os percentuais da página 8 do PDF.
- Heatmap mostra `Mai/2023 = 3,16%` e `Jul/2021 = -1,24%` (extremos do PDF).

Type-check do projeto sem erros; nenhum warning de hidratação no console ao abrir `/investimentos`.
