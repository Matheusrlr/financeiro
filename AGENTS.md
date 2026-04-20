# AGENTS.md — contexto para assistentes (LLM)

## Propósito do produto

Plataforma web **pessoal** para upload de **documentos financeiros em PDF** (faturas de cartão de crédito, extratos de investimento), extração automática de dados via IA, categorização inteligente e visualização de **tendências de gastos e investimentos** ao longo do tempo.

O objetivo é ter **visibilidade total** das finanças pessoais num único lugar, com insights acionáveis gerados por IA. Não é contabilidade formal — é uma ferramenta de **reflexão financeira com apoio de IA**.

## Stack

| Área | Tecnologia |
|------|------------|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript |
| Estilização | Tailwind CSS 4 + shadcn/ui |
| Charts | Recharts ou Tremor |
| Banco de dados | Supabase (PostgreSQL) com Drizzle ORM |
| Storage | Supabase Storage (PDFs em bucket privado) |
| Auth | Supabase Auth (magic link / Google OAuth) |
| IA | LLM local (Ollama) via API OpenAI-compatible; `npm run analyze` |
| Validação | Zod |
| Deploy | Vercel |

## Configuração e execução

- **Variáveis de ambiente:** em `.env.local` (não commitado). Template em `.env.example`.
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `LOCAL_LLM_URL` (padrão: `http://localhost:11434/v1`), `LOCAL_LLM_MODEL` (padrão: `llama3.1`)
- **Dev:** `npm run dev` (Next.js na porta 3000)
- **Análise IA:** `npm run analyze` — roda extração e categorização via LLM local (requer Ollama ou compatível)
- **Supabase local:** `npx supabase start` (opcional, para dev offline)
- **Migrations:** Drizzle ORM — `npm run db:push` ou `npm run db:migrate`

## Fluxo principal (pipeline)

1. **Upload** na UI: drag & drop do PDF + seleção do cartão.
2. **Armazenamento:** PDF salvo no Supabase Storage com nome UUID; **hash SHA-256** evita reprocessar o mesmo arquivo.
3. **Extração via IA:** texto do PDF enviado ao Claude, que retorna JSON estruturado com transações (data, descrição, valor) + mês de referência.
4. **Categorização via IA:** Claude categoriza cada transação: `necessario` | `superfluo` | `investimento`.
5. **Persistência:** transações salvas via Drizzle ORM no PostgreSQL.
6. **Cache de insights:** ao inserir transações de um mês, cache de insights é invalidado.

## Modelo de dados (conceitos)

- **`reference_month`:** string `YYYY-MM`, eixo principal de agregação.
- **`documents`:** uma linha por PDF processado (tipo, hash, status, source detectado).
- **`cards`:** cartões do usuário (nome, banco, cor).
- **`transactions`:** uma linha por transação, com `category` ∈ `necessario` | `superfluo` | `investimento`.
- **`investments`:** (Fase 2) posições e movimentações de ativos.
- **`insights_cache`:** JSON dos insights da IA para o mês (evita re-chamar o modelo).
- **RLS:** todas as tabelas com Row Level Security — `user_id = auth.uid()`.

## Camada de IA

- **Extração de PDF:** LLM recebe texto bruto → retorna transações estruturadas em JSON (validado com Zod). Isso substitui regex por banco — escala para qualquer instituição.
- **Categorização:** LLM classifica cada transação com definições claras de categoria.
- **Consultoria mensal:** resumo, comparação mês a mês, vazamentos de dinheiro, dicas. Cache no banco.
- **Provider:** LLM local via API OpenAI-compatible (`src/lib/ai/client.ts`). Padrão: Ollama com `llama3.1`. Executado via `npm run analyze`.
- **Migração futura:** client preparado para trocar provider (Anthropic, OpenAI, etc.) alterando apenas `src/lib/ai/client.ts`.

## Onde estender o sistema

| Objetivo | Onde olhar |
|----------|------------|
| Novo tipo de documento | Prompt de extração em `src/lib/ai/`, tipo no enum de `documents` |
| Ajustar categorias | Prompt de categorização em `src/lib/ai/prompts.ts` |
| Novo cartão/corretora | UI de gestão de cartões, schema Drizzle |
| Mudar modelo de IA | `src/lib/ai/` — trocar modelo no client |
| Novo tipo de investimento | Enum `asset_type` no schema, prompt de extração |

## Convenções

- **Linguagem:** TypeScript strict, sem `any`.
- **UI:** todos os textos em **português brasileiro**.
- **Componentes:** shadcn/ui como base, customizar com Tailwind.
- **API Routes:** Next.js Route Handlers em `src/app/api/`.
- **Validação:** Zod em toda fronteira (input do usuário, resposta da IA, params de API).
- **Commits:** mensagens em inglês, descritivas.
- **Segurança:** nunca expor `SUPABASE_SERVICE_ROLE_KEY` no client. Usar server-side apenas.

## Especificação completa

Detalhes em `.specs/project/PROJECT.md` e `.specs/project/ROADMAP.md`.

## Resumo em uma frase

**Pipeline:** PDF → upload (Supabase Storage) → `npm run analyze` (LLM local extrai + categoriza) → PostgreSQL (Supabase) → Next.js dashboard (métricas, gráficos, tabela, insights com cache).
