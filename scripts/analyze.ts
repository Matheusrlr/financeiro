/**
 * Script CLI para rodar análise de IA localmente.
 *
 * Uso:
 *   npm run analyze                    # Processa todos os documentos pendentes
 *   npm run analyze -- --month 2026-04 # Processa/regenera um mês específico
 *   npm run analyze -- --help          # Mostra ajuda
 *
 * Requer:
 *   - Ollama rodando localmente (ou outro servidor OpenAI-compatible)
 *   - Modelo configurado via LOCAL_LLM_MODEL (padrão: llama3.1)
 *   - DATABASE_URL configurado no .env.local
 *
 * O que faz:
 *   1. Busca documentos com status 'processing' no banco
 *   2. Para cada um, extrai transações via LLM local
 *   3. Categoriza cada transação (necessario/superfluo/investimento)
 *   4. Salva no banco e atualiza status do documento para 'completed'
 */

import "dotenv/config";

const args = process.argv.slice(2);

if (args.includes("--help")) {
  console.log(`
Financeiro — Análise local com IA

Uso:
  npm run analyze                     Processa documentos pendentes
  npm run analyze -- --month 2026-04  Regenera insights de um mês
  npm run analyze -- --help           Mostra esta ajuda

Variáveis de ambiente (.env.local):
  DATABASE_URL        Conexão PostgreSQL (Supabase)
  LOCAL_LLM_URL       URL da API do LLM (padrão: http://localhost:11434/v1)
  LOCAL_LLM_MODEL     Modelo a usar (padrão: llama3.1)
`);
  process.exit(0);
}

async function main() {
  const monthArg = args.indexOf("--month");
  const targetMonth = monthArg !== -1 ? args[monthArg + 1] : null;

  if (targetMonth && !/^\d{4}-\d{2}$/.test(targetMonth)) {
    console.error("Formato de mês inválido. Use YYYY-MM (ex: 2026-04)");
    process.exit(1);
  }

  console.log("Financeiro — Análise com IA local");
  console.log(`LLM: ${process.env.LOCAL_LLM_URL ?? "http://localhost:11434/v1"}`);
  console.log(`Modelo: ${process.env.LOCAL_LLM_MODEL ?? "llama3.1"}`);
  console.log("");

  if (targetMonth) {
    console.log(`Modo: regenerar insights para ${targetMonth}`);
    // TODO: Implementar quando pipeline de insights estiver conectado ao banco
    console.log("(Ainda não implementado — aguardando pipeline completo)");
  } else {
    console.log("Modo: processar documentos pendentes");
    // TODO: Implementar quando upload pipeline estiver conectado ao banco
    console.log("(Ainda não implementado — aguardando pipeline completo)");
  }

  console.log("\nScript pronto. Pipeline será conectado nas próximas etapas.");
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
