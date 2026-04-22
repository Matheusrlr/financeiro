import { categorize } from "./categorize"
import type { ParsedTransaction, ParseResult } from "./types"

const MONTH_MAP: Record<string, string> = {
  JAN: "01", FEV: "02", MAR: "03", ABR: "04", MAI: "05", JUN: "06",
  JUL: "07", AGO: "08", SET: "09", OUT: "10", NOV: "11", DEZ: "12",
}

// "DD MON [•••• XXXX] Description R$ XX,XX"
// Credits use U+2212 (−) before R$; filtered out below
const TXN_REGEX =
  /^(\d{2}) (JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ) (?:\u2022{4} (\d{4}) )?(.+?) ([\u2212]?R\$ [\d.,]+)\s*$/gim

// "FATURA DD MON YYYY" header
const HEADER_REGEX = /FATURA\s+(?:DE\s+)?(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\.?\s+(\d{4})/i

function parseAmount(raw: string): number {
  // raw is like "R$ 197,00" or "−R$ 0,91"
  return parseFloat(
    raw
      .replace(/[\u2212]/g, "-")
      .replace(/R\$|\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
  )
}

export function parseNubank(text: string): ParseResult {
  let refYear = new Date().getFullYear()
  let refMonthNum = new Date().getMonth() + 1
  let referenceMonth = ""

  const headerMatch = HEADER_REGEX.exec(text)
  if (headerMatch) {
    const monStr = headerMatch[2].toUpperCase()
    refMonthNum = parseInt(MONTH_MAP[monStr], 10)
    refYear = parseInt(headerMatch[3], 10)
    referenceMonth = `${refYear}-${String(refMonthNum).padStart(2, "0")}`
  }

  // Ignore payments section ("Pagamentos -R$ ..." summary line, not "Pagamentos de boleto")
  const pagIdx = text.search(/^Pagamentos\s+[\u2212\-]?R\$/im)
  const mainText = pagIdx > 0 ? text.slice(0, pagIdx) : text

  const transactions: ParsedTransaction[] = []

  TXN_REGEX.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = TXN_REGEX.exec(mainText)) !== null) {
    const [, dayStr, monStr, cardSuffix, desc, amountRaw] = match

    const descClean = desc.trim()

    // Skip credits: amount starts with U+2212 (−)
    if (amountRaw.startsWith("\u2212")) continue

    // Skip IOF lines and adjustments
    if (/^IOF\s+de/i.test(descClean)) continue
    if (/^Ajuste\s+a\s+cr[eé]dito/i.test(descClean)) continue

    const amount = parseAmount(amountRaw)
    if (isNaN(amount) || amount <= 0) continue

    // Infer year: if transaction month > reference month => previous year
    const txnMonthNum = parseInt(MONTH_MAP[monStr.toUpperCase()], 10)
    const txnYear = txnMonthNum > refMonthNum ? refYear - 1 : refYear
    const month = MONTH_MAP[monStr.toUpperCase()]
    const date = `${txnYear}-${month}-${dayStr}`

    transactions.push({
      date,
      description: descClean,
      amount,
      category: categorize(descClean),
      cardSuffix: cardSuffix ?? undefined,
    })
  }

  if (!referenceMonth && transactions.length > 0) {
    referenceMonth = transactions[0].date.slice(0, 7)
  }

  return { bank: "nubank", referenceMonth, transactions }
}
