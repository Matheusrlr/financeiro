# AGENTS.md — contexto para assistentes (LLM)

## Propósito do produto

Aplicação **pessoal** para enviar **faturas de cartão em PDF** (uso mensal planejado), extrair transações, classificar cada linha como gasto **essencial** vs **supérfluo** e visualizar **tendências de médio/longo prazo**. O objetivo do usuário é enxergar padrões de gasto e distinguir o que manter do que pode ser reduzido.

Não é contabilidade formal nem substituto de conselho financeiro profissional; é uma ferramenta de **visibilidade** e reflexão com apoio de IA.

## Stack

| Área | Tecnologia |
|------|------------|
| UI | Streamlit (`app/streamlit_app.py`) |
| Dados | SQLite (`data/financeiro.db`, schema em `src/db/schema.sql`) |
| PDF | `pdfplumber`, PyMuPDF — extração em `src/pdf/` |
| IA | Google Gemini (`google-genai`), modelo em `src/config.py` (`GEMINI_MODEL`, hoje `gemini-2.5-flash`) |
| Validação de JSON da IA | Pydantic (`src/ai/schemas.py`) |

## Configuração e execução

- **Variável de ambiente:** `GEMINI_API_KEY` em `.env` na raiz do projeto (carregado por `python-dotenv` em `src/config.py`). Sem chave, upload pode funcionar até a parte de PDF, mas **categorização e consultoria falham** na chamada ao modelo.
- **Diretórios de dados:** `src/config.py` define `DATA_DIR`, `UPLOADS_DIR`, `DB_PATH`. `ensure_data_dirs()` cria pastas se necessário.
- **Rodar o dashboard:** a partir da raiz do repo, algo como: `streamlit run app/streamlit_app.py` (o app injeta a raiz no `sys.path`).

Artefatos sensíveis (`.env`, banco, PDFs enviados) estão no `.gitignore`; não commitar segredos nem extratos reais se o remoto for público.

## Fluxo principal (pipeline)

1. **Upload** no Streamlit: bytes do PDF + `card_code` (`card_a` | `card_b`) + **mês de referência** `YYYY-MM`.
2. **Armazenamento:** PDF salvo em `data/uploads/` com nome UUID; **hash SHA-256** evita reprocessar o mesmo arquivo (`process_upload` em `src/services/pipeline.py`).
3. **Detecção de banco:** `src/pdf/bank_detect.py` lê texto das primeiras páginas e retorna `bank_a`, `bank_b` ou `generic` (marcadores configuráveis por instituição).
4. **Parsing:** parsers específicos (`src/pdf/parsers/bank_a.py`, `bank_b.py`) ou heurística genérica em `src/pdf/parsers/base.py` (`ParsedTxn`: data `YYYY-MM-DD`, descrição, valor).
5. **Categorização (Gemini):** `categorize_transactions` em `src/ai/client.py` — saída JSON validada como `CategorizationResponse`; categorias permitidas: **`necessario`** | **`superfluo`** (definições nos prompts em `src/ai/prompts.py`).
6. **Persistência:** `Repository.insert_statement` + `insert_transactions`; categorias ficam na coluna `transactions.category`.
7. **Cache de consultoria:** ao inserir transações de um mês, o cache de insights daquele mês é invalidado (`delete_consulting_cache`).

## Modelo de dados (conceitos)

- **`reference_month`:** string `YYYY-MM`, eixo principal de agregação (não confundir com data individual da compra `txn_date`).
- **`cards`:** códigos fixos seedados (`card_a`, `card_b`); rótulos exibidos na UI.
- **`statements`:** uma linha por PDF processado (arquivo original, caminho guardado, banco detectado, hash).
- **`transactions`:** uma linha por transação parseada, sempre com `category` ∈ `necessario` | `superfluo`.
- **`consulting_cache`:** JSON serializado dos insights do Gemini para o mês (evita re-chamar o modelo; botão “Regenerar insights” força nova geração).

## Camada de análise e IA

- **Agregações:** `src/services/analytics.py` — totais por mês, histórico para gráficos, payload para consultoria (`build_consulting_payload`: totais atuais, totais por cartão, histórico dos últimos N meses).
- **Consultoria:** `src/services/consulting.py` — lê cache ou chama `generate_consulting`; estrutura esperada em `ConsultingResponse` (`summary`, `month_over_month`, `leaks`, `tips`).

## Onde estender o sistema

| Objetivo | Onde olhar |
|----------|------------|
| Novo layout de banco | Novo parser + marcadores em `bank_detect.py` + ramo em `parse_statement_pdf` (`pipeline.py`) |
| Ajustar o que é “necessário” vs “supérfluo” | `categorization_prompt` em `src/ai/prompts.py` |
| Novo cartão no sistema | Inserir linha em `cards` (ou estender seed em `repository.py` / migration manual no SQLite) e UI em `streamlit_app.py` |
| Mudar modelo Gemini | `GEMINI_MODEL` em `src/config.py` |

## Convenções e armadilhas

- Índices das transações na categorização são **0-based** e devem bater com a lista enviada ao modelo; há fallback por valor+descrição e default **`necessario`** se faltar item (`apply_categories_to_transactions`).
- Duplicata de PDF é bloqueada por hash; mensagens de erro ao usuário vêm de `ValueError` no pipeline.
- Textos de interface e prompts estão em **português**; mantenha coerência ao alterar copy ou instruções do modelo.

## Resumo em uma frase

**Pipeline:** PDF → detecção de banco → parse de linhas → Gemini classifica `necessario`/`superfluo` → SQLite → Streamlit (métricas, gráficos, tabela, insights com cache).
