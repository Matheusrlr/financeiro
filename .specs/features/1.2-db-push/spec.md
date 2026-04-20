# 1.2 — Schema do Banco no Supabase (db:push + RLS) — Especificação

**Complexidade:** Small → Quick operational task
**Auto-sizing decision:** O schema Drizzle está 100% definido em `src/db/schema.ts`. A tarefa é executar `npm run db:push` para criar as tabelas no PostgreSQL do Supabase e adicionar as políticas de Row Level Security (RLS) via SQL. Sem nova lógica de código — configuração de infraestrutura + verificação.

## Problem Statement

As tabelas `cards`, `documents`, `transactions` e `insights_cache` estão definidas no schema Drizzle mas não existem ainda no banco de dados Supabase real. Sem as tabelas criadas e RLS habilitado, nenhuma operação de banco funciona. O RLS é crítico para segurança: cada usuário deve ver apenas seus próprios dados.

## Goals

- [ ] `npm run db:push` executa sem erros e cria todas as tabelas
- [ ] 4 tabelas criadas: `cards`, `documents`, `transactions`, `insights_cache`
- [ ] 4 enums criados: `category`, `document_type`, `document_status`, `asset_type`, `insight_type`
- [ ] Todos os índices criados conforme schema
- [ ] RLS habilitado em todas as tabelas
- [ ] Política `user_id = auth.uid()` aplicada em todas as tabelas
- [ ] Bucket `documents` criado no Supabase Storage (preparação para 1.4)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Migrations SQL versionadas | `db:push` é suficiente para desenvolvimento; migrations formais entram em produção |
| Seed de dados | Seed de cartões virá na feature 1.3 |
| Storage policies (RLS de Storage) | Específico da feature 1.4 — upload de PDF |

---

## User Stories

### P1: Criar tabelas via db:push ⭐ MVP

**User Story:** Como desenvolvedor, quero executar `npm run db:push` para que o schema Drizzle seja refletido no PostgreSQL do Supabase.

**Why P1:** Sem tabelas no banco, zero features podem ser implementadas ou testadas.

**Acceptance Criteria:**

1. WHEN `DATABASE_URL` em `.env.local` aponta para o Supabase real THEN `npm run db:push` SHALL executar sem erros
2. WHEN db:push completa THEN as tabelas `cards`, `documents`, `transactions`, `insights_cache` SHALL existir no schema `public`
3. WHEN db:push completa THEN os enums `category`, `document_type`, `document_status`, `asset_type`, `insight_type` SHALL existir
4. WHEN db:push completa THEN todos os índices definidos no schema SHALL estar criados

**Independent Test:** Rodar `npm run db:push` → abrir Supabase Studio (`npm run db:studio` ou dashboard web) → confirmar tabelas visíveis.

---

### P1: Row Level Security (RLS) em todas as tabelas ⭐ MVP

**User Story:** Como usuário, quero que meus dados financeiros sejam isolados dos dados de outros usuários.

**Why P1:** Sem RLS, qualquer usuário autenticado pode ler dados de outros via queries diretas — violação grave de privacidade.

**Acceptance Criteria:**

1. WHEN RLS é habilitado em `cards` THEN `SELECT * FROM cards` sem contexto de auth SHALL retornar 0 linhas
2. WHEN RLS policy `user_id = auth.uid()` está ativa em `cards` THEN usuário A não SHALL ver cards do usuário B
3. WHEN mesma política está em `documents`, `transactions`, `insights_cache` THEN isolamento SHALL ser garantido em todas as tabelas
4. WHEN Supabase client autenticado faz query THEN `auth.uid()` é automaticamente injetado pela sessão

**Independent Test:** Via Supabase SQL Editor: `SELECT * FROM cards;` sem `auth.uid()` setado deve retornar vazio. Com `SET LOCAL role = authenticated; SET LOCAL "request.jwt.claims" = ...` deve retornar apenas dados do usuário.

---

### P1: Bucket de Storage criado ⭐ MVP

**User Story:** Como desenvolvedor, quero que o bucket `documents` exista no Supabase Storage para que o upload de PDFs (feature 1.4) possa ser implementado.

**Why P1:** Criar o bucket é pré-requisito para a feature 1.4. Melhor criar aqui junto com a infraestrutura.

**Acceptance Criteria:**

1. WHEN bucket `documents` é criado no Supabase Storage THEN `public: false` (privado)
2. WHEN bucket existe THEN estrutura de path planejada `{user_id}/{file_hash}.pdf` SHALL ser válida

**Independent Test:** Supabase Dashboard → Storage → verificar bucket `documents` com visibility "Private".

---

## SQL para RLS

```sql
-- Habilitar RLS
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights_cache ENABLE ROW LEVEL SECURITY;

-- Políticas: cada usuário vê apenas seus dados
CREATE POLICY "users_own_cards" ON cards
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "users_own_documents" ON documents
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "users_own_transactions" ON transactions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "users_own_insights" ON insights_cache
  FOR ALL USING (user_id = auth.uid());
```

---

## Arquivos Impactados

| Arquivo | Ação |
|---------|------|
| `src/db/schema.ts` | Já definido — apenas verificar após push |
| `drizzle.config.ts` | Já configurado — apenas verificar DATABASE_URL |
| `.env.local` | Garantir `DATABASE_URL` aponta para Supabase |
| Supabase SQL Editor | Executar SQL de RLS manualmente |
| Supabase Dashboard | Criar bucket `documents` no Storage |

---

## Requirement Traceability

| Requirement ID | Story | Status |
|----------------|-------|--------|
| DB-01 | P1: db:push sem erros | Pending |
| DB-02 | P1: Tabelas criadas (cards, documents, transactions, insights_cache) | Pending |
| DB-03 | P1: Enums criados | Pending |
| DB-04 | P1: RLS habilitado em todas as tabelas | Pending |
| DB-05 | P1: Políticas user_id = auth.uid() ativas | Pending |
| DB-06 | P1: Bucket `documents` criado como privado | Pending |

---

## Success Criteria

- [ ] `npm run db:push` retorna exit code 0
- [ ] 4 tabelas visíveis no Supabase Table Editor
- [ ] RLS ativo confirmado no painel (ícone de cadeado nas tabelas)
- [ ] Bucket `documents` privado no Storage
- [ ] `npm run db:studio` abre e mostra tabelas com dados corretos
