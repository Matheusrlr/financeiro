export const EXTRACTION_SYSTEM_PROMPT = `Você é um assistente especializado em extrair dados financeiros de textos de faturas de cartão de crédito e extratos de investimento brasileiros.

Regras:
- Extraia TODAS as transações encontradas no texto.
- Para cada transação retorne: date (YYYY-MM-DD), description (texto original), amount (número positivo em reais).
- Ignore linhas de cabeçalho, totais, pagamentos anteriores, e estornos.
- Infira o reference_month (YYYY-MM) a partir de datas de vencimento ou do padrão predominante de datas.
- Retorne APENAS JSON válido, sem markdown, sem explicações.`;

export function buildExtractionPrompt(pdfText: string): string {
  return `Extraia as transações do seguinte texto de fatura/extrato:

---
${pdfText}
---

Retorne um JSON com esta estrutura exata:
{
  "reference_month": "YYYY-MM",
  "transactions": [
    { "date": "YYYY-MM-DD", "description": "texto", "amount": 123.45 }
  ]
}`;
}

export const CATEGORIZATION_SYSTEM_PROMPT = `Você é um assistente financeiro pessoal. Sua tarefa é categorizar transações em exatamente uma das três categorias:

- "necessario": despesas essenciais para moradia, alimentação básica, saúde, transporte essencial, educação necessária, serviços públicos obrigatórios, seguros.
- "superfluo": lazer, delivery não essencial, assinaturas dispensáveis, compras por impulso, itens claramente não essenciais, restaurantes, entretenimento.
- "investimento": aportes em corretoras, previdência privada, compra de ativos financeiros, poupança programada.

Em caso de dúvida, classifique como "necessario".
Retorne APENAS JSON válido, sem markdown, sem explicações.`;

export function buildCategorizationPrompt(
  transactions: { description: string; amount: number }[]
): string {
  const items = transactions
    .map((t, i) => `${i}. "${t.description}" — R$ ${t.amount.toFixed(2)}`)
    .join("\n");

  return `Categorize cada transação abaixo:

${items}

Retorne um JSON com esta estrutura exata:
{
  "items": [
    { "index": 0, "category": "necessario" | "superfluo" | "investimento" }
  ]
}`;
}

export const CONSULTING_SYSTEM_PROMPT = `Você é um consultor financeiro pessoal. Analise os dados fornecidos e gere insights em português brasileiro.

Seja direto, específico e acionável. Não use jargão financeiro complexo. Foque em:
1. O que mudou em relação ao mês anterior
2. Onde o dinheiro está "vazando" sem necessidade
3. Dicas práticas para o próximo mês

Retorne APENAS JSON válido, sem markdown, sem explicações.`;

export function buildConsultingPrompt(payload: {
  currentMonth: string;
  totals: { total: number; necessario: number; superfluo: number; investimento: number };
  cardBreakdown: { card: string; total: number }[];
  history: { month: string; total: number; necessario: number; superfluo: number; investimento: number }[];
}): string {
  return `Analise os seguintes dados financeiros e gere insights:

Mês atual: ${payload.currentMonth}
Totais: R$ ${payload.totals.total.toFixed(2)} (necessário: R$ ${payload.totals.necessario.toFixed(2)}, supérfluo: R$ ${payload.totals.superfluo.toFixed(2)}, investimento: R$ ${payload.totals.investimento.toFixed(2)})

Gastos por cartão:
${payload.cardBreakdown.map((c) => `- ${c.card}: R$ ${c.total.toFixed(2)}`).join("\n")}

Histórico (últimos meses):
${payload.history.map((h) => `- ${h.month}: total R$ ${h.total.toFixed(2)} (nec: ${h.necessario.toFixed(2)}, sup: ${h.superfluo.toFixed(2)}, inv: ${h.investimento.toFixed(2)})`).join("\n")}

Retorne um JSON com esta estrutura exata:
{
  "summary": "parágrafo resumo do mês",
  "month_over_month": [
    { "metric": "total|necessario|superfluo|investimento", "direction": "up|down|flat", "comment": "explicação" }
  ],
  "leaks": ["vazamento 1", "vazamento 2"],
  "tips": ["dica 1", "dica 2", "dica 3"]
}`;
}
