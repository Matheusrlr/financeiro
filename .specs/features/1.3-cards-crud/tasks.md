# 1.3 — CRUD de Cartões — Tasks

**Spec**: `.specs/features/1.3-cards-crud/spec.md`
**Status**: Draft

> **Nota sobre testes:** O projeto não tem infraestrutura de testes configurada (nenhum framework em `package.json`). Todas as tasks têm `Tests: none`. Verificação via browser + Supabase Studio.

---

## Execution Plan

### Phase 1: Foundation (Parallel — todos independentes)

```
T1 [P] ─────────────────────────────────────────────────────┐
T2 [P] ─────────────────────────────────────────────────────┤
T3 [P] ─────────────────────────────────────────────────────┤──→ Phase 2
T4 [P] ─────────────────────────────────────────────────────┤
T7 [P] ─────────────────────────────────────────────────────┘
```

### Phase 2: UI Components (após T3 e T4)

```
T3, T4 completos → T5
```

### Phase 3: Integration (após T1, T2, T5)

```
T1, T2, T5 completos → T6
```

---

## Task Breakdown

### T1: API route GET + POST /api/cards [P]

**What**: Criar route handler com listagem de cartões do usuário e criação de novo cartão
**Where**: `src/app/api/cards/route.ts`
**Depends on**: Nenhuma (pré-requisito externo: Feature 1.2 — tabelas no Supabase)
**Reuses**: `src/db/index.ts` (db client), `src/db/schema.ts` (cards table), `src/lib/supabase/server.ts` (createClient)

**Tools**: NONE (built-in tools)

**Done when**:

- [ ] `GET /api/cards` retorna array de cartões filtrado por `userId` do usuário autenticado (Drizzle: `where eq(cards.userId, user.id)`)
- [ ] `POST /api/cards` cria cartão com `{ name, bankCode, color? }` no body; `userId` sempre vem da session (nunca do body)
- [ ] Ambos retornam 401 quando não há sessão ativa
- [ ] `POST` com `name` vazio retorna 400 com `{ error: 'name is required' }`
- [ ] `color` usa default `#6366f1` quando não informado
- [ ] TypeScript compila sem erros (`npx tsc --noEmit`)

**Verify**:
```
curl -X POST http://localhost:3000/api/cards \
  -H "Content-Type: application/json" \
  -d '{"name":"Nubank","bankCode":"nubank","color":"#8B5CF6"}'
# Com cookie de sessão → deve retornar { id, name, bankCode, color, createdAt }
# Sem cookie → deve retornar 401
```

**Tests**: none
**Gate**: `npx tsc --noEmit` (zero erros)

---

### T2: API route PATCH + DELETE /api/cards/[id] [P]

**What**: Criar route handler para atualizar e remover um cartão específico
**Where**: `src/app/api/cards/[id]/route.ts`
**Depends on**: Nenhuma
**Reuses**: `src/db/index.ts`, `src/db/schema.ts`, `src/lib/supabase/server.ts`

**Tools**: NONE

**Done when**:

- [ ] `PATCH /api/cards/[id]` atualiza apenas campos enviados (`name?`, `bankCode?`, `color?`) usando Drizzle com `where: and(eq(cards.id, id), eq(cards.userId, user.id))`
- [ ] `DELETE /api/cards/[id]` remove o cartão com mesma cláusula `where` (user scoped)
- [ ] Quando nenhuma linha afetada (id não existe ou pertence a outro usuário) → retorna 404
- [ ] Ambos retornam 401 sem sessão
- [ ] TypeScript compila sem erros

**Verify**:
```
# PATCH
curl -X PATCH http://localhost:3000/api/cards/{id} \
  -H "Content-Type: application/json" \
  -d '{"name":"Nubank Black"}'
# → 200 { id, name: "Nubank Black", ... }

# DELETE de outro user → 404 (não 403, evita enumeration)
```

**Tests**: none
**Gate**: `npx tsc --noEmit`

---

### T3: Componente CardForm (criar e editar) [P]

**What**: Criar componente de formulário reutilizável para criação e edição de cartão, usando `Dialog` da shadcn
**Where**: `src/components/cards/card-form.tsx`
**Depends on**: Nenhuma
**Reuses**: `src/components/ui/dialog.tsx`, `src/components/ui/input.tsx`, `src/components/ui/label.tsx`, `src/components/ui/button.tsx`

**Tools**: NONE

**Props interface**:
```tsx
interface CardFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card?: { id: string; name: string; bankCode: string; color: string } // undefined = criar
  onSuccess: () => void
}
```

**Done when**:

- [ ] Dialog abre com campos: Nome (`input text`), Banco (`input text`, placeholder "nubank"), Cor (`input type="color"` ou seletor com opções pré-definidas)
- [ ] Quando `card` prop está definida: campos pré-preenchidos e título "Editar cartão"; quando undefined: campos vazios e título "Novo cartão"
- [ ] Submit chama `POST /api/cards` (criar) ou `PATCH /api/cards/[id]` (editar) via `fetch`
- [ ] Durante submit: botão desabilitado + texto "Salvando..."
- [ ] Sucesso: chama `onSuccess()` e fecha o Dialog via `onOpenChange(false)`
- [ ] Erro da API: exibe `toast.error(...)` sem fechar o Dialog
- [ ] Campo `name` vazio bloqueia submit (validação HTML5 `required`)
- [ ] TypeScript compila sem erros

**Verify**: Renderizar em storybook ou na página — abrir dialog, preencher, submeter, ver campo sendo limpo e dialog fechando.

**Tests**: none
**Gate**: `npx tsc --noEmit`

---

### T4: Componente DeleteConfirmDialog [P]

**What**: Criar diálogo de confirmação antes de deletar um cartão
**Where**: `src/components/cards/delete-confirm-dialog.tsx`
**Depends on**: Nenhuma
**Reuses**: `src/components/ui/dialog.tsx`, `src/components/ui/button.tsx`

**Props interface**:
```tsx
interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cardName: string
  onConfirm: () => Promise<void>
}
```

**Done when**:

- [ ] Dialog exibe mensagem "Remover {cardName}?" com aviso "Esta ação não pode ser desfeita."
- [ ] Botão "Cancelar" fecha o dialog (`onOpenChange(false)`)
- [ ] Botão "Remover" (variante `destructive`) chama `onConfirm()` e desabilita ambos botões durante execução
- [ ] Após `onConfirm()` resolver, dialog fecha automaticamente
- [ ] TypeScript compila sem erros

**Verify**: Renderizar com `open={true}` e `cardName="Nubank"` — ver texto correto, clicar Cancelar fecha, clicar Remover chama callback.

**Tests**: none
**Gate**: `npx tsc --noEmit`

---

### T7: AppHeader — adicionar link "Cartões" na navegação [P]

**What**: Adicionar link `/cartoes` na nav do AppHeader
**Where**: `src/components/dashboard/app-header.tsx`
**Depends on**: Nenhuma
**Reuses**: Padrão de links existente no AppHeader (className idêntico aos outros links)

**Done when**:

- [ ] Link "Cartões" com `href="/cartoes"` inserido após o link "Dashboard" e antes de "Upload" na nav
- [ ] Usa exatamente o mesmo `className` dos links existentes
- [ ] TypeScript compila sem erros

**Verify**: `npm run dev` → inspecionar header → ver link "Cartões".

**Tests**: none
**Gate**: `npx tsc --noEmit`

---

### T5: Componente CardList

**What**: Criar componente de listagem de cartões com ações de editar/deletar
**Where**: `src/components/cards/card-list.tsx`
**Depends on**: T3 (CardForm), T4 (DeleteConfirmDialog)
**Reuses**: `src/components/ui/card.tsx`, `src/components/ui/button.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/skeleton.tsx`

**Props interface**:
```tsx
interface CardListProps {
  cards: Array<{ id: string; name: string; bankCode: string; color: string; createdAt: string }>
  loading: boolean
  onRefresh: () => void
}
```

**Done when**:

- [ ] Quando `loading=true`: exibe 3 `Skeleton` cards
- [ ] Quando `cards` é array vazio: exibe estado vazio "Nenhum cartão cadastrado" + botão "Adicionar cartão" que abre `CardForm`
- [ ] Quando `cards` tem itens: cada card exibe nome, bank_code, badge colorido (usando `color` como `backgroundColor` inline)
- [ ] Cada card tem botão "Editar" → abre `CardForm` com `card` prop preenchida
- [ ] Cada card tem botão "Remover" → abre `DeleteConfirmDialog`
- [ ] `DeleteConfirmDialog.onConfirm` chama `DELETE /api/cards/[id]` via fetch, exibe `toast.success("Cartão removido")` e chama `onRefresh()`
- [ ] Botão "Adicionar cartão" visível no topo da lista (além do estado vazio)
- [ ] TypeScript compila sem erros

**Verify**: Renderizar com array de 2 cartões mock → ver cards, clicar editar → ver form pré-preenchido, clicar remover → ver dialog de confirmação.

**Tests**: none
**Gate**: `npx tsc --noEmit`

---

### T6: Página /cartoes — integração completa

**What**: Criar a página de gestão de cartões que busca dados da API e renderiza `CardList`
**Where**: `src/app/(auth)/cartoes/page.tsx`
**Depends on**: T1 (GET /api/cards), T2 (PATCH/DELETE), T5 (CardList)
**Reuses**: Padrão de `(auth)/dashboard/page.tsx` para estrutura da página

**Done when**:

- [ ] Página é Server Component: faz `fetch('/api/cards')` com cookies de sessão usando `createClient()` do servidor e Drizzle (ou fetch da própria API)
  > **Alternativa preferida (Server Component direto):** query Drizzle diretamente na página (sem fetch para a própria API), passando dados como props para `CardList` que é Client Component
- [ ] `CardList` recebe `cards` iniciais como prop; ações de mutação (create/edit/delete) usam `router.refresh()` para re-render do Server Component
- [ ] Título da página: "Cartões" com subtítulo "Gerencie seus cartões de crédito"
- [ ] Botão "Adicionar cartão" no header da página (além do que está no CardList)
- [ ] Página protegida pelo `(auth)/layout.tsx` existente (sem código extra necessário)
- [ ] TypeScript compila sem erros

**Verify**:
```
npm run dev → acessar /cartoes → ver lista (ou estado vazio)
→ criar cartão → ver na lista
→ editar cartão → ver atualização
→ deletar cartão → ver remoção
→ Supabase Studio: confirmar registros no banco
```

**Tests**: none
**Gate**: `npx tsc --noEmit`

**Commit**: `feat(cards): implement full CRUD for credit cards`

---

## Parallel Execution Map

```
Phase 1 (Todos independentes — executar em paralelo):
  T1 [P] → GET+POST /api/cards
  T2 [P] → PATCH+DELETE /api/cards/[id]
  T3 [P] → CardForm component
  T4 [P] → DeleteConfirmDialog component
  T7 [P] → AppHeader nav link

Phase 2 (após T3 e T4):
  T5 → CardList (compõe T3 + T4)

Phase 3 (após T1, T2 e T5):
  T6 → Página /cartoes (integração final)
```

---

## Task Granularity Check

| Task | Scope | Status |
|------|-------|--------|
| T1: GET+POST /api/cards | 1 arquivo, 1 responsabilidade (collection endpoints) | ✅ Granular |
| T2: PATCH+DELETE /api/cards/[id] | 1 arquivo, 1 responsabilidade (item endpoints) | ✅ Granular |
| T3: CardForm | 1 componente | ✅ Granular |
| T4: DeleteConfirmDialog | 1 componente | ✅ Granular |
| T5: CardList | 1 componente (compõe T3+T4 como dependências) | ✅ Granular |
| T6: Página /cartoes | 1 arquivo page — integração final | ✅ Granular |
| T7: AppHeader nav link | 1 arquivo, 1 linha adicionada | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagrama Mostra | Status |
|------|-------------------|-----------------|--------|
| T1 | Nenhuma | Fase 1 independente | ✅ |
| T2 | Nenhuma | Fase 1 independente | ✅ |
| T3 | Nenhuma | Fase 1 independente | ✅ |
| T4 | Nenhuma | Fase 1 independente | ✅ |
| T7 | Nenhuma | Fase 1 independente | ✅ |
| T5 | T3, T4 | Após T3 e T4 | ✅ |
| T6 | T1, T2, T5 | Após T1, T2, T5 | ✅ |

---

## Test Co-location Validation

> Sem TESTING.md — nenhum framework de testes configurado. Verificação manual via browser.

| Task | Camada criada | Matriz requer | Task diz | Status |
|------|---------------|--------------|----------|--------|
| T1 | API Route | none (sem TESTING.md) | none | ✅ |
| T2 | API Route | none | none | ✅ |
| T3 | UI Component | none | none | ✅ |
| T4 | UI Component | none | none | ✅ |
| T5 | UI Component | none | none | ✅ |
| T6 | Page | none | none | ✅ |
| T7 | Header Component | none | none | ✅ |

---

## Requirement Traceability

| Req ID | Task | Status |
|--------|------|--------|
| CARDS-01 (listar cartões) | T1 (GET), T6 (page) | Pending |
| CARDS-02 (estado vazio + CTA) | T5 (CardList) | Pending |
| CARDS-03 (criar via POST) | T1 (POST), T3 (form) | Pending |
| CARDS-04 (userId da session) | T1, T2 | Pending |
| CARDS-05 (editar via PATCH) | T2 (PATCH), T3 (form edit mode) | Pending |
| CARDS-06 (deletar com confirmação) | T2 (DELETE), T4 (dialog), T5 | Pending |
| CARDS-07 (403/404 cross-user) | T1, T2 (where clause user-scoped) | Pending |
| CARDS-08 (transações set null) | Schema já tem `onDelete: set null` — verificar na T6 | Pending |
| CARDS-09 (feedback visual) | T3, T4, T5 (toasts + loading) | Pending |
