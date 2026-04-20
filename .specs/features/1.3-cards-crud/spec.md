# 1.3 — CRUD de Cartões — Especificação

**Complexidade:** Large
**Auto-sizing decision:** Multi-componente com API routes, UI de listagem + formulário modal, queries Drizzle com RLS, e integração Supabase Auth (user_id). Requer design + tasks antes de executar.

## Problem Statement

O usuário precisa cadastrar seus cartões de crédito (ex: Nubank, Inter, Itaú) para que as transações extraídas de PDFs possam ser associadas ao cartão correto. Sem CRUD de cartões, a associação fatura → cartão → análise por cartão é impossível. Atualmente a tabela `cards` existe no schema mas não há API, UI, nem forma do usuário gerenciar seus cartões.

## Goals

- [ ] Usuário pode criar, visualizar, editar e deletar cartões
- [ ] Cada cartão tem: nome, banco (bank_code), cor (hex)
- [ ] Cartões são isolados por usuário (RLS garante — `user_id = auth.uid()`)
- [ ] UI acessível via `/cartoes` no menu lateral
- [ ] Feedback visual (loading, success, error) em todas as operações

## Out of Scope

| Feature | Reason |
|---------|--------|
| Métricas por cartão | Feature 1.7 (Dashboard) — depende de transações |
| Ícone de banco (logo) | Nice-to-have, não bloqueia MVP |
| Reordenação de cartões | Sem drag & drop por enquanto |
| Limite de crédito | Não está no schema atual |
| Associação automática cartão ↔ fatura | Feature 1.4/1.5 — extração IA |

---

## User Stories

### P1: Listar cartões ⭐ MVP

**User Story:** Como usuário, quero ver todos os meus cartões cadastrados para saber quais tenho registrados no sistema.

**Why P1:** Base para toda a gestão — sem listagem o usuário não sabe o que tem.

**Acceptance Criteria:**

1. WHEN usuário acessa `/cartoes` THEN sistema SHALL exibir lista de cartões do usuário autenticado
2. WHEN usuário não tem cartões THEN sistema SHALL exibir estado vazio com CTA "Adicionar cartão"
3. WHEN cartões existem THEN cada card SHALL mostrar: nome, bank_code, cor (badge colorido)
4. WHEN dados estão carregando THEN sistema SHALL exibir skeleton/spinner

**Independent Test:** Acessar `/cartoes` com usuário logado → confirmar lista (ou estado vazio).

---

### P1: Criar cartão ⭐ MVP

**User Story:** Como usuário, quero adicionar um novo cartão com nome, banco e cor para organizá-lo no sistema.

**Why P1:** Sem criação não há cartões para associar às faturas.

**Acceptance Criteria:**

1. WHEN usuário clica em "Adicionar cartão" THEN sistema SHALL exibir formulário (modal ou inline) com campos: Nome, Banco (bank_code), Cor
2. WHEN usuário submete formulário válido THEN `POST /api/cards` SHALL criar registro no banco com `user_id = auth.uid()`
3. WHEN criação é bem-sucedida THEN lista SHALL atualizar com novo cartão e toast "Cartão criado com sucesso"
4. WHEN nome está vazio THEN sistema SHALL mostrar erro de validação (não submeter)
5. WHEN `POST /api/cards` falha THEN sistema SHALL mostrar toast de erro sem fechar o formulário

**Independent Test:** Clicar "Adicionar" → preencher formulário → confirmar que cartão aparece na lista.

---

### P1: Editar cartão ⭐ MVP

**User Story:** Como usuário, quero editar nome, banco ou cor de um cartão existente para corrigir informações.

**Why P1:** Erros de cadastro são comuns — sem edição o usuário teria que deletar e recriar.

**Acceptance Criteria:**

1. WHEN usuário clica em "Editar" num cartão THEN sistema SHALL abrir formulário pré-preenchido com dados atuais
2. WHEN usuário submete edição válida THEN `PATCH /api/cards/[id]` SHALL atualizar registro
3. WHEN atualização é bem-sucedida THEN lista SHALL refletir dados atualizados e toast "Cartão atualizado"
4. WHEN `id` do cartão não pertence ao usuário autenticado THEN API SHALL retornar 403

**Independent Test:** Clicar "Editar" → alterar nome → confirmar que lista mostra novo nome.

---

### P1: Deletar cartão ⭐ MVP

**User Story:** Como usuário, quero remover um cartão que não uso mais para manter a lista limpa.

**Why P1:** Sem delete o usuário acumula cartões obsoletos.

**Acceptance Criteria:**

1. WHEN usuário clica em "Deletar" THEN sistema SHALL exibir diálogo de confirmação ("Tem certeza?")
2. WHEN usuário confirma THEN `DELETE /api/cards/[id]` SHALL remover o registro
3. WHEN deleção é bem-sucedida THEN cartão SHALL desaparecer da lista e toast "Cartão removido"
4. WHEN cartão tem transações associadas (`card_id` em `transactions`) THEN FK `onDelete: set null` garante que transações não são deletadas — apenas desvinculadas
5. WHEN `id` não pertence ao usuário THEN API SHALL retornar 403

**Independent Test:** Deletar cartão → confirmar que sumiu da lista → verificar no Supabase Studio que transações relacionadas têm `card_id = null`.

---

## Edge Cases

- WHEN dois cartões têm o mesmo nome THEN sistema SHALL permitir (sem unique constraint em nome)
- WHEN cor não é fornecida THEN sistema SHALL usar default `#6366f1` (indigo — já no schema)
- WHEN bank_code tem caracteres especiais THEN validação SHALL aceitar apenas lowercase alfanumérico + hífen
- WHEN usuário tenta PATCH/DELETE de cartão de outro usuário via API direta THEN Drizzle query com `where: eq(cards.userId, userId)` retorna 0 rows → 404

---

## API Design

```
GET    /api/cards          → lista cartões do usuário autenticado
POST   /api/cards          → cria cartão { name, bankCode, color? }
PATCH  /api/cards/[id]     → atualiza { name?, bankCode?, color? }
DELETE /api/cards/[id]     → remove cartão
```

**Auth:** Todas as rotas usam `createClient()` (server) para obter `user.id` — nunca confiar em user_id vindo do body.

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/app/api/cards/route.ts` | Criar — GET + POST |
| `src/app/api/cards/[id]/route.ts` | Criar — PATCH + DELETE |
| `src/app/(auth)/cartoes/page.tsx` | Criar — página de listagem |
| `src/components/cards/card-list.tsx` | Criar — lista de cartões |
| `src/components/cards/card-form.tsx` | Criar — formulário create/edit |
| `src/components/cards/delete-confirm.tsx` | Criar — diálogo de confirmação |
| `src/components/dashboard/app-header.tsx` | Modificar — adicionar link "Cartões" no nav |
| `src/db/index.ts` | Verificar — garantir export do db client |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|----------------|-------|-------|--------|
| CARDS-01 | P1: Listar cartões do usuário | Design | Pending |
| CARDS-02 | P1: Estado vazio com CTA | Design | Pending |
| CARDS-03 | P1: Criar cartão via POST /api/cards | Design | Pending |
| CARDS-04 | P1: user_id setado automaticamente (não do body) | Design | Pending |
| CARDS-05 | P1: Editar cartão via PATCH /api/cards/[id] | Design | Pending |
| CARDS-06 | P1: Deletar cartão com confirmação | Design | Pending |
| CARDS-07 | P1: 403 para operações cross-user | Design | Pending |
| CARDS-08 | P1: Transações preservadas ao deletar cartão (set null) | Design | Pending |
| CARDS-09 | P1: Feedback visual (toast, loading) em todas operações | Design | Pending |

**Coverage:** 9 total, 0 mapeados em tasks ⚠️

---

## Success Criteria

- [ ] Usuário consegue criar, editar e deletar um cartão em < 5 cliques cada
- [ ] Nenhuma operação expõe dados de outro usuário
- [ ] Lista atualiza sem refresh de página após cada operação
- [ ] Toast de feedback aparece em sucesso E em erro
