# Plano: Ajustes no Financeiro Dashboard

## Contexto
O app financeiro tem 5 ajustes pendentes: dashboard com filtro por cartao, nova aba de investimentos, upload dividido (faturas/investimentos), mascaramento de transacoes, e correcao do erro 500 no upload. O erro 500 bloqueia tudo pois sem upload funcional nao ha dados para testar.

---

## Ordem de Execucao

### 1. Fix Upload 500 Error
**Causa provavel:** tabelas nao existem no banco (pasta `drizzle/` ausente = migrations nunca rodaram) e/ou bucket "documents" nao existe no Supabase Storage.

**Acoes:**
- Rodar `npx drizzle-kit push` para criar tabelas e enums no PostgreSQL
- Criar bucket "documents" no Supabase (script ou manual)
- Adicionar try/catch + console.error no upload route para logs claros
- Verificar .env.local tem DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY

**Arquivos:** `src/app/api/upload/route.ts`, novo `scripts/setup-storage.ts`

---

### 2. Upload Page - Duas Areas
Dividir upload em faturas e investimentos.

**Acoes:**
- `dropzone.tsx`: adicionar prop `documentType`, incluir no formData
- `upload-section.tsx`: adicionar prop `documentType`, filtrar docs por tipo
- `upload/page.tsx`: renderizar dois `<UploadSection>` com titulos distintos
- `route.ts`: ler `formData.get("type")`, validar, usar no insert

**Arquivos:** `src/components/upload/dropzone.tsx`, `src/components/upload/upload-section.tsx`, `src/app/(auth)/upload/page.tsx`, `src/app/api/upload/route.ts`

---

### 3. Substituir "Cartoes" por "Investimentos" na nav

**Acoes:**
- `app-header.tsx`: trocar link Cartoes por Investimentos (`/investimentos`)
- Criar pagina `/investimentos` com layout placeholder:
  - Dropdown: Todos / Brasileiro / Estrangeiro
  - Cards: Taxa Selic, Ganhos/Perdas, Crescimento patrimonial (nominal + %)
  - Graficos placeholder: Evolucao do patrimonio, Alocacao de ativos
  - Tudo com valores zerados + mensagem orientando upload
- Redirecionar `/cartoes` para `/dashboard`

**Novos arquivos:** `src/app/(auth)/investimentos/page.tsx`, `src/components/investimentos/investimentos-dashboard.tsx`
**Modificar:** `src/components/dashboard/app-header.tsx`, `src/app/(auth)/cartoes/page.tsx`

---

### 4. Transacoes - Botao Hide/Show

**Acoes:**
- Manter page como server component, buscar transacoes via Drizzle
- Criar `<TransactionsView>` client component com estado `visible` (default: false)
- Botao com icone Eye/EyeOff (Lucide) no header
- Quando mascarado: valores = "R$ •••,••", descricoes = "••••••••"
- Criar `<TransactionTable>` com formatacao pt-BR

**Novos arquivos:** `src/components/transactions/transactions-view.tsx`, `src/components/transactions/transaction-table.tsx`
**Modificar:** `src/app/(auth)/transactions/page.tsx`

---

### 5. Dashboard - Dropdown de Cartoes + Graficos Comparativos + CRUD Cartoes

**O mais complexo.** Sub-tarefas:

**A) Estrutura:** Converter dashboard page para buscar dados server-side (cards + transactions via Drizzle) e passar para `<DashboardClient>` client component.

**B) Dropdown de cartoes:** Componente `<CardSelector>` com opcoes "Todos" + cada cartao. Dot colorido ao lado do nome.

**C) Metricas:** Calcular gasto total, necessario, superfluo, investimento a partir de transactions filtradas pelo cartao selecionado.

**D) Graficos com Recharts:**
- "Evolucao mensal": LineChart com uma linha por cartao quando "Todos" (cores: Inter=#EC811D, Nubank=#800ACE, outros=card.color)
- "Distribuicao por categoria": BarChart/PieChart com breakdown necessario/superfluo/investimento

**E) Card management:** Reutilizar `<CardList>` existente dentro do dashboard. Incluir lista de documentos/faturas do cartao com opcao de remover fatura incorreta.

**F) Funcao utilitaria `resolveCardColor`:**
```ts
function resolveCardColor(card: { bankCode: string; color: string }): string {
  const code = card.bankCode.toLowerCase();
  if (code === "inter") return "#EC811D";
  if (code === "nubank") return "#800ACE";
  return card.color;
}
```

**Novos arquivos:**
- `src/components/dashboard/dashboard-client.tsx`
- `src/components/dashboard/card-selector.tsx`
- `src/components/dashboard/charts/monthly-evolution-chart.tsx`
- `src/components/dashboard/charts/category-distribution-chart.tsx`

**Modificar:** `src/app/(auth)/dashboard/page.tsx`

---

## Verificacao

1. **Upload:** Subir um PDF de fatura → deve retornar 201, aparecer na lista com status "Processando"
2. **Upload investimentos:** Subir PDF na area de investimentos → documento salvo com type "investment_statement"
3. **Nav:** Clicar em "Investimentos" → abrir pagina com dropdown e placeholders
4. **Transacoes:** Pagina carrega mascarada, clicar no olho revela valores
5. **Dashboard:** Dropdown mostra cartoes, graficos mudam ao selecionar, CRUD de cartoes funciona
6. **Dashboard comparativo:** Com "Todos" selecionado, grafico mostra linhas de cores diferentes por cartao
