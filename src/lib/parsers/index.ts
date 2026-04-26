import { parseInter } from "./inter"
import { parseNubank } from "./nubank"
import type { ParseResult } from "./types"

export type { ParseResult, ParsedTransaction, Category } from "./types"
export type { ParsedInvestmentReport } from "./investments/inter"
export { parseInvestmentReportInter } from "./investments/inter"

export type DocumentKind =
  | "credit_card_inter"
  | "credit_card_nubank"
  | "investment_inter"
  | null

export function detectDocumentKind(text: string): DocumentKind {
  // Investment report: Inter Prime consolidated
  if (/Relat[oó]rio\s+Consolidado/i.test(text) && /interprime/i.test(text)) {
    return "investment_inter"
  }
  // Inter credit card: tab-separated transactions with "DD de MMM. YYYY"
  if (/\d de (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\./i.test(text)) {
    return "credit_card_inter"
  }
  // Nubank: mentions "nubank" or has bullet-style card "•••• XXXX" or FATURA header
  if (
    /nubank/i.test(text) ||
    /•{4}/.test(text) ||
    /FATURA\s+\d{1,2}\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)/i.test(text)
  ) {
    return "credit_card_nubank"
  }
  return null
}

export function detectBank(text: string): "inter" | "nubank" | null {
  const kind = detectDocumentKind(text)
  if (kind === "credit_card_inter") return "inter"
  if (kind === "credit_card_nubank") return "nubank"
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
