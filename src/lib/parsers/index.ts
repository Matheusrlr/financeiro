import { parseInter } from "./inter"
import { parseNubank } from "./nubank"
import type { ParseResult } from "./types"

export type { ParseResult, ParsedTransaction, Category } from "./types"

export function detectBank(text: string): "inter" | "nubank" | null {
  // Inter: tab-separated transactions with "DD de MMM. YYYY"
  if (/\d de (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\./i.test(text)) {
    return "inter"
  }
  // Nubank: mentions "nubank" or has bullet-style card "•••• XXXX" or FATURA header
  if (
    /nubank/i.test(text) ||
    /\u2022{4}/.test(text) ||
    /FATURA\s+\d{1,2}\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)/i.test(text)
  ) {
    return "nubank"
  }
  return null
}

export function parseDocument(text: string): ParseResult {
  const bank = detectBank(text)

  if (bank === "inter") return parseInter(text)
  if (bank === "nubank") return parseNubank(text)

  // Fallback: try Inter first, then Nubank
  const interResult = parseInter(text)
  if (interResult.transactions.length > 0) return interResult

  return parseNubank(text)
}
