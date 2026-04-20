import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionPrompt,
  CATEGORIZATION_SYSTEM_PROMPT,
  buildCategorizationPrompt,
  CONSULTING_SYSTEM_PROMPT,
  buildConsultingPrompt,
} from "./prompts";
import {
  extractionResponseSchema,
  type ExtractionResponse,
  categorizationResponseSchema,
  type CategorizationResponse,
  consultingResponseSchema,
  type ConsultingResponse,
} from "./schemas";

/**
 * Calls an OpenAI-compatible API (works with Ollama, LM Studio, etc.)
 * Default: Ollama at localhost:11434
 */
async function callLocalModel(
  system: string,
  prompt: string
): Promise<string> {
  const baseUrl =
    process.env.LOCAL_LLM_URL ?? "http://localhost:11434/v1";
  const model = process.env.LOCAL_LLM_MODEL ?? "llama3.1";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    throw new Error(
      `LLM request failed (${res.status}): ${await res.text()}`
    );
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

function parseJson(raw: string): unknown {
  // Strip markdown fences if present
  const cleaned = raw.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned);
}

export async function extractTransactionsFromPdf(
  pdfText: string
): Promise<ExtractionResponse> {
  const raw = await callLocalModel(
    EXTRACTION_SYSTEM_PROMPT,
    buildExtractionPrompt(pdfText)
  );
  return extractionResponseSchema.parse(parseJson(raw));
}

export async function categorizeTransactions(
  transactions: { description: string; amount: number }[]
): Promise<CategorizationResponse> {
  const raw = await callLocalModel(
    CATEGORIZATION_SYSTEM_PROMPT,
    buildCategorizationPrompt(transactions)
  );
  return categorizationResponseSchema.parse(parseJson(raw));
}

export async function generateConsulting(payload: {
  currentMonth: string;
  totals: {
    total: number;
    necessario: number;
    superfluo: number;
    investimento: number;
  };
  cardBreakdown: { card: string; total: number }[];
  history: {
    month: string;
    total: number;
    necessario: number;
    superfluo: number;
    investimento: number;
  }[];
}): Promise<ConsultingResponse> {
  const raw = await callLocalModel(
    CONSULTING_SYSTEM_PROMPT,
    buildConsultingPrompt(payload)
  );
  return consultingResponseSchema.parse(parseJson(raw));
}
