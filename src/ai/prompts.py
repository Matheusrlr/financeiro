"""Prompt templates for Gemini."""

from __future__ import annotations

import json
from typing import Any


def categorization_prompt(transactions: list[dict[str, Any]], reference_month: str) -> str:
    payload = [
        {"index": i, "description": t["description"], "amount": t["amount"]}
        for i, t in enumerate(transactions)
    ]
    transactions_json = json.dumps(payload, ensure_ascii=False)
    return f"""Você é um assistente financeiro pessoal. Sua tarefa é CLASSIFICAR cada transação como gasto NECESSÁRIO ou SUPÉRFLUO.

Definições:
- "necessario": despesas essenciais para moradia, alimentação básica, saúde, transporte essencial, educação necessária, serviços públicos obrigatórios.
- "superfluo": lazer, delivery não essencial, assinaturas dispensáveis, compras por impulso, itens claramente não essenciais.

Regras:
1. Use APENAS os dados fornecidos (descrição e valor). Não invente transações.
2. Cada transação deve receber exatamente UMA categoria: "necessario" ou "superfluo".
3. Responda SOMENTE com um JSON válido, sem markdown, sem texto antes ou depois.

Formato de resposta obrigatório:
{{
  "reference_month": "{reference_month}" ou null,
  "items": [
    {{
      "index": <número inteiro, 0-based, posição na lista de entrada>,
      "description": "<mesma descrição da entrada>",
      "amount": <número>,
      "category": "necessario" | "superfluo"
    }}
  ]
}}

Mês de referência sugerido: {reference_month}

Lista de transações (JSON de entrada):
{transactions_json}"""


def consulting_prompt(analytics: dict[str, Any]) -> str:
    analytics_json = json.dumps(analytics, ensure_ascii=False)
    return f"""Você é um consultor financeiro pessoal. Analise os dados agregados de gastos por mês e a fatura do mês atual.

Objetivos:
1. Identificar AUMENTOS ou REDUÇÕES relevantes de gastos em relação aos meses anteriores (cite números aproximados ou percentuais quando possível).
2. Apontar onde pode haver "vazamento" de dinheiro (ex.: crescimento de supérfluos, padrões por cartão).
3. Fornecer de 3 a 7 dicas ACIONÁVEIS e objetivas para economizar no próximo mês.

Restrições:
- Baseie-se apenas nos dados fornecidos. Se faltar dado, diga o que não é possível concluir.
- Não invente valores não presentes no JSON.
- Responda SOMENTE com JSON válido, sem markdown, sem texto antes ou depois.

Formato de resposta obrigatório:
{{
  "summary": "<parágrafo curto em português sobre a situação geral do mês atual>",
  "month_over_month": [
    {{
      "metric": "total" | "necessario" | "superfluo",
      "direction": "up" | "down" | "flat",
      "comment": "<explicação breve>"
    }}
  ],
  "leaks": [
    "<frase objetiva sobre possível vazamento 1>",
    "<frase objetiva sobre possível vazamento 2>"
  ],
  "tips": [
    "<dica acionável 1>",
    "<dica acionável 2>"
  ]
}}

Dados (JSON):
{analytics_json}"""
