# 1.1 — Auth com Supabase Real (Magic Link) — Especificação

**Complexidade:** Small → Quick verification
**Auto-sizing decision:** Auth já está implementado em código. A tarefa é configurar as variáveis de ambiente reais e validar o fluxo ponta-a-ponta contra um projeto Supabase real. Sem nova UI ou lógica a construir — apenas configuração + smoke test.

## Problem Statement

O código de autenticação está 100% implementado (login page, callback route, middleware, layout guard), mas ainda não foi testado contra um projeto Supabase real. As variáveis de ambiente em `.env.local` precisam apontar para um projeto Supabase ativo. Sem essa validação, nenhuma feature subsequente pode ser desenvolvida ou testada.

## Goals

- [ ] `.env.local` configurado com credenciais reais do Supabase
- [ ] Magic link enviado com sucesso para email real
- [ ] Callback `/auth/callback` troca o code por session sem erros
- [ ] Middleware redireciona usuário não autenticado para `/login`
- [ ] Middleware redireciona usuário autenticado para `/dashboard` ao tentar acessar `/login`
- [ ] Logout funciona (session destruída, redirect para `/login`)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Google OAuth | Fase posterior — magic link é suficiente para MVP |
| Testes automatizados de auth | Sem infraestrutura de testes E2E ainda |
| Email templates customizados | Padrão Supabase é suficiente |

---

## User Stories

### P1: Configurar .env.local com projeto Supabase real ⭐ MVP

**User Story:** Como desenvolvedor, quero conectar o app a um projeto Supabase real para que o fluxo de auth funcione de ponta-a-ponta.

**Why P1:** Bloqueador para todas as outras features — sem DB e Auth reais nada pode ser testado.

**Acceptance Criteria:**

1. WHEN `.env.local` contém `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `DATABASE_URL` válidos THEN `npm run dev` inicia sem erros de configuração
2. WHEN o app sobe THEN nenhum erro de `supabase: no such host` ou `invalid key` aparece no console

**Independent Test:** `npm run dev` → abrir `http://localhost:3000` → não ver erro de CORS ou credencial inválida.

---

### P1: Fluxo de login com magic link funcional ⭐ MVP

**User Story:** Como usuário, quero receber um magic link no meu email e ao clicar ser autenticado automaticamente.

**Why P1:** É o único método de login implementado — sem isso o app é inacessível.

**Acceptance Criteria:**

1. WHEN usuário submete email válido na `/login` THEN `supabase.auth.signInWithOtp()` retorna sem erro e toast "Link de login enviado!" aparece
2. WHEN usuário clica no magic link no email THEN é redirecionado para `/auth/callback?code=xxx`
3. WHEN `/auth/callback` recebe `code` válido THEN `exchangeCodeForSession(code)` troca por session e redireciona para `/dashboard`
4. WHEN `code` é inválido ou expirado THEN sistema SHALL redirecionar para `/login?error=auth`

**Independent Test:** Abrir `/login`, digitar email real, verificar email, clicar no link, confirmar que chega no `/dashboard`.

---

### P1: Proteção de rotas ⭐ MVP

**User Story:** Como usuário não autenticado, quero ser redirecionado para o login ao tentar acessar páginas protegidas.

**Why P1:** Segurança base — sem isso qualquer pessoa acessa o dashboard.

**Acceptance Criteria:**

1. WHEN usuário não autenticado acessa `/dashboard` THEN middleware SHALL redirecionar para `/login`
2. WHEN usuário autenticado acessa `/login` THEN middleware SHALL redirecionar para `/dashboard`
3. WHEN sessão expira THEN próximo request SHALL redirecionar para `/login`

**Independent Test:** Abrir aba anônima → acessar `/dashboard` → confirmar redirect para `/login`.

---

### P2: Logout

**User Story:** Como usuário autenticado, quero fazer logout para encerrar minha sessão.

**Why P2:** Necessário mas não bloqueador para testar o fluxo de auth inicial.

**Acceptance Criteria:**

1. WHEN usuário clica em "Sair" no `AppHeader` THEN `supabase.auth.signOut()` é chamado
2. WHEN signOut completa THEN usuário SHALL ser redirecionado para `/login`
3. WHEN usuário tenta acessar `/dashboard` após logout THEN SHALL ser redirecionado para `/login`

**Independent Test:** Logar → clicar em "Sair" → confirmar redirect para `/login` → tentar acessar `/dashboard` → confirmar redirect.

---

## Edge Cases

- WHEN email inválido (sem @) é submetido THEN formulário SHALL mostrar validação HTML5 nativa (campo `type="email"`)
- WHEN magic link é clicado mais de uma vez THEN segundo clique SHALL redirecionar para `/login?error=auth` (code já consumido)
- WHEN `NEXT_PUBLIC_SUPABASE_URL` está ausente THEN `createClient()` SHALL lançar erro claro no console (não silencioso)

---

## Arquivos Impactados

| Arquivo | Ação |
|---------|------|
| `.env.local` | Preencher com credenciais reais do Supabase |
| `src/app/(public)/login/page.tsx` | Já implementado — apenas testar |
| `src/app/auth/callback/route.ts` | Já implementado — apenas testar |
| `src/lib/supabase/middleware.ts` | Já implementado — apenas testar |
| `src/app/(auth)/layout.tsx` | Já implementado — verificar logout |
| `src/components/dashboard/app-header.tsx` | Verificar se logout está implementado |

---

## Requirement Traceability

| Requirement ID | Story | Status |
|----------------|-------|--------|
| AUTH-01 | P1: Configurar .env.local | Pending |
| AUTH-02 | P1: Magic link enviado | Pending |
| AUTH-03 | P1: Callback troca code por session | Pending |
| AUTH-04 | P1: Proteção de rotas (não autenticado) | Pending |
| AUTH-05 | P1: Redirect de autenticado fora do /login | Pending |
| AUTH-06 | P2: Logout funcional | Pending |

**Status values:** Pending → Implementing → Verified

---

## Success Criteria

- [ ] Magic link enviado e recebido em < 30 segundos
- [ ] Fluxo completo login → dashboard sem erros no console
- [ ] Rota `/dashboard` sem auth retorna redirect (não 200 com dados)
- [ ] Logout encerra sessão (nova aba anônima não tem acesso)
