# Financeiro — Plataforma Pessoal de Inteligência Financeira

## Visão

Plataforma web pessoal para **upload de documentos financeiros em PDF** (faturas de cartão, extratos de investimento), extração automática de dados via IA, categorização inteligente e visualização de **tendências de gastos e investimentos** ao longo do tempo. O objetivo é ter visibilidade total das finanças pessoais num único lugar, com insights acionáveis gerados por IA.

## Problema

- Faturas de cartão e extratos de investimento são PDFs desconectados
- Sem visão consolidada de gastos vs investimentos mês a mês
- Difícil identificar padrões de gasto desnecessário sem análise manual
- Categorização manual é tediosa e inconsistente

## Solução

Pipeline automatizado: **PDF → extração via IA → categorização → persistência → dashboard com métricas e insights**

A IA (Claude) lê o texto do PDF e extrai dados estruturados, eliminando a necessidade de regex frágil por banco. Isso escala automaticamente para qualquer instituição financeira.

---

## Stack Técnica

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Frontend** | Next.js 15 (App Router) + React 19 + TypeScript | SSR/SSG, deploy nativo Vercel, tipagem forte |
| **Estilização** | Tailwind CSS 4 + shadcn/ui | Design system consistente, componentes acessíveis |
| **Charts** | Recharts ou Tremor | Gráficos React-nativos, boa integração com Tailwind |
| **Banco de dados** | Supabase (PostgreSQL) | Auth integrado, Storage, Row Level Security, SDK excelente |
| **Storage de PDFs** | Supabase Storage | Bucket privado, URLs assinadas, dedup por hash SHA-256 |
| **Autenticação** | Supabase Auth | Magic link ou OAuth (Google), session management |
| **IA** | Anthropic Claude API (claude-sonnet-4-20250514) | Extração de dados de PDF, categorização, insights financeiros |
| **AI SDK** | Vercel AI SDK (@ai-sdk/anthropic) | Streaming, structured output, integração nativa Next.js |
| **Deploy** | Vercel | Zero-config para Next.js, preview deploys, edge functions |
| **Validação** | Zod | Schema validation para dados da IA e formulários |
| **ORM** | Drizzle ORM | Type-safe, leve, migrations automáticas, boa com Supabase |

---

## Funcionalidades

### Fase 1 — Paridade com MVP atual (faturas de cartão)

#### F1.1 — Autenticação
- Login via magic link (email) ou Google OAuth
- Sessão persistente, logout
- Proteção de todas as rotas (middleware Next.js)

#### F1.2 — Upload de PDF de fatura
- Drag & drop ou file picker na UI
- Detecção automática do tipo de documento (fatura de cartão)
- Extração do mês de referência via IA
- Deduplicação por hash SHA-256 (bloqueia reprocessamento)
- Armazenamento no Supabase Storage (bucket privado)
- Progress indicator durante processamento

#### F1.3 — Extração de transações via IA
- Texto do PDF enviado ao Claude
- Claude retorna JSON estruturado: lista de transações (data, descrição, valor)
- Validação com Zod schema
- Fallback: retry com prompt ajustado se resposta inválida

#### F1.4 — Categorização via IA
- Cada transação categorizada como: `necessario` | `superfluo` | `investimento`
- Claude recebe contexto das definições de categoria
- Categorias aplicadas e persistidas no banco
- Possibilidade de override manual pelo usuário

#### F1.5 — Dashboard principal
- **Métricas do mês**: total gasto, necessário, supérfluo, investimento
- **Gráfico de barras**: evolução mensal dos gastos
- **Gráfico de pizza/donut**: distribuição por categoria
- **Tabela de transações**: filtros por categoria, cartão, busca por descrição
- **Seletor de mês** na sidebar ou header

#### F1.6 — Insights com IA (Consultoria)
- Análise mensal gerada pelo Claude:
  - Resumo do mês
  - Comparação mês a mês (direção: subiu/desceu/estável)
  - Possíveis vazamentos de dinheiro
  - Dicas acionáveis para o próximo mês
- Cache no banco (evita re-chamar a API)
- Botão "Regenerar insights"

#### F1.7 — Gestão de cartões
- CRUD de cartões (nome, banco, cor/ícone)
- Associação cartão ↔ banco para detecção automática
- Métricas por cartão

### Fase 2 — Investimentos

#### F2.1 — Upload de extratos de investimento
- Suporte a PDFs de corretoras (XP, Rico, Clear, BTG, etc.)
- IA extrai: ativo, tipo (ação, FII, renda fixa, cripto), quantidade, valor, data
- Categorização automática por tipo de investimento

#### F2.2 — Dashboard de investimentos
- Posição consolidada por tipo de ativo
- Evolução patrimonial ao longo do tempo
- Rendimentos mensais
- Distribuição da carteira (pie chart)

#### F2.3 — Visão unificada
- Dashboard principal mostra gastos E investimentos
- Métrica: "quanto investi vs quanto gastei" por mês
- Insights cruzados: "você gastou X em supérfluo, se investisse teria Y em Z meses"

### Fase 3 — Refinamentos

#### F3.1 — Categorias customizáveis
- Usuário pode criar subcategorias
- IA aprende com overrides manuais (few-shot no prompt)

#### F3.2 — Metas financeiras
- Definir meta de gasto mensal
- Definir meta de investimento mensal
- Alertas quando próximo do limite

#### F3.3 — Exportação
- Exportar dados em CSV/Excel
- Relatório PDF mensal gerado automaticamente

---

## Modelo de Dados (PostgreSQL via Supabase)

### Tabelas principais

```
users (gerenciado pelo Supabase Auth)
├── id (uuid, PK)
├── email
└── created_at

cards
├── id (uuid, PK)
├── user_id (FK → users)
├── name (ex: "Nubank", "Inter")
├── bank_code (ex: "nubank", "inter")
├── color (hex para UI)
└── created_at

documents
├── id (uuid, PK)
├── user_id (FK → users)
├── type (enum: 'credit_card_statement' | 'investment_statement')
├── file_name (original)
├── storage_path (caminho no Supabase Storage)
├── file_hash (SHA-256, UNIQUE)
├── reference_month (YYYY-MM)
├── detected_source (ex: "nubank", "xp", "generic")
├── status (enum: 'processing' | 'completed' | 'error')
├── metadata (jsonb — dados extras do processamento)
└── created_at

transactions
├── id (uuid, PK)
├── user_id (FK → users)
├── document_id (FK → documents)
├── card_id (FK → cards, nullable — só para faturas)
├── reference_month (YYYY-MM)
├── txn_date (date)
├── description (text)
├── amount (numeric)
├── category (enum: 'necessario' | 'superfluo' | 'investimento')
├── user_override (boolean, default false)
└── created_at

investments (Fase 2)
├── id (uuid, PK)
├── user_id (FK → users)
├── document_id (FK → documents)
├── asset_name (text)
├── asset_type (enum: 'acao' | 'fii' | 'renda_fixa' | 'cripto' | 'outro')
├── quantity (numeric)
├── unit_price (numeric)
├── total_value (numeric)
├── txn_date (date)
├── reference_month (YYYY-MM)
└── created_at

insights_cache
├── id (uuid, PK)
├── user_id (FK → users)
├── reference_month (YYYY-MM, UNIQUE per user)
├── insight_type (enum: 'monthly' | 'investment')
├── content (jsonb)
├── model_used (text)
└── created_at
```

### Row Level Security (RLS)
- Todas as tabelas com RLS habilitado
- Política: `user_id = auth.uid()` — cada usuário só vê seus dados
- Storage: bucket privado, políticas por user_id no path

---

## Arquitetura de Referência

```
financeiro/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Grupo de rotas com auth
│   │   │   ├── dashboard/      # Dashboard principal
│   │   │   ├── upload/         # Upload de documentos
│   │   │   ├── transactions/   # Lista de transações
│   │   │   └── investments/    # Dashboard investimentos (Fase 2)
│   │   ├── (public)/           # Rotas públicas
│   │   │   └── login/          # Página de login
│   │   ├── api/                # API Routes
│   │   │   ├── upload/         # POST: processar PDF
│   │   │   ├── insights/       # GET/POST: gerar/buscar insights
│   │   │   └── transactions/   # CRUD transações
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing/redirect
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── charts/             # Componentes de gráficos
│   │   ├── dashboard/          # Widgets do dashboard
│   │   └── upload/             # Componentes de upload
│   ├── lib/
│   │   ├── supabase/           # Client e server Supabase
│   │   ├── ai/                 # Prompts e client Claude
│   │   ├── pdf/                # Extração de texto de PDF
│   │   └── utils.ts            # Helpers gerais
│   ├── db/
│   │   ├── schema.ts           # Drizzle schema
│   │   └── migrations/         # SQL migrations
│   └── types/                  # TypeScript types globais
├── supabase/
│   ├── migrations/             # Supabase migrations
│   └── config.toml             # Config local Supabase
├── public/                     # Assets estáticos
├── .env.local                  # Variáveis de ambiente (não commitado)
├── .env.example                # Template de variáveis
├── next.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
├── tsconfig.json
├── package.json
└── AGENTS.md
```

---

## Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Princípios de Design

1. **IA como motor de extração**: Não usar regex para parsing de PDF. Claude extrai dados estruturados diretamente do texto — escala para qualquer banco/corretora sem código custom.
2. **Mobile-first**: UI responsiva, dashboard usável no celular.
3. **Segurança por padrão**: RLS no Supabase, auth em todas as rotas, PDFs em storage privado.
4. **Cache inteligente**: Insights da IA cacheados por mês. Só regenera quando solicitado ou quando há novos dados.
5. **Custo consciente**: Usar Claude Haiku para tarefas simples (categorização), Sonnet para análises complexas (insights).
6. **Português primeiro**: Toda a UI, prompts e mensagens em PT-BR.
7. **Incremental**: Fase 1 cobre faturas de cartão (paridade com MVP). Fases seguintes adicionam investimentos e refinamentos.
