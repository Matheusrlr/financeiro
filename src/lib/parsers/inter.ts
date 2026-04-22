import { categorize } from "./categorize"
import type { ParsedTransaction, ParseResult } from "./types"

const MONTH_MAP: Record<string, string> = {
  jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
  jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
}

// "DD de MMM. YYYY DESCRIPTION \t- \tR$ XX,XX" (tab separates desc from amount)
const TXN_REGEX =
  /(\d{1,2}) de (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\. (\d{4}) (.+?) \t- \t(\+? ?R\$ [\d.,]+)/gi

// Vencimento: DD/MM/YYYY
const DUE_DATE_REGEX = /Vencimento\s+(\d{2})\/(\d{2})\/(\d{4})/i

// Last 4 digits of card: "5554****1165" or "CARTÃO 5554****1165"
const CARD_SUFFIX_REGEX = /\d{4}\*{4}(\d{4})/

function parseAmount(raw: string): number {
  // raw is like "R$ 1.250,00" or "+ R$ 4.233,47"
  return parseFloat(
    raw
      .replace(/\+/, "")
      .replace(/R\$|\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
  )
}

export function parseInter(text: string): ParseResult {
  // Reference month: from "Vencimento DD/MM/YYYY"
  let referenceMonth = ""
  const dueMatch = DUE_DATE_REGEX.exec(text)
  if (dueMatch) {
    referenceMonth = `${dueMatch[3]}-${dueMatch[2]}`
  }

  // Ignore "Próxima fatura" section (next invoice installments).
  // Match the standalone section header, not mentions in body text.
  const proxIdx = text.search(/\nPr[oó]xima fatura\nData de corte/i)
  const mainText = proxIdx > 0 ? text.slice(0, proxIdx) : text

  const transactions: ParsedTransaction[] = []

  // Track current card suffix by scanning the text for card patterns
  // We'll do a simple pass: for each transaction, find the nearest preceding card line
  const lines = mainText.split("\n")
  let currentSuffix: string | undefined

  for (const line of lines) {
    const cardMatch = CARD_SUFFIX_REGEX.exec(line)
    if (cardMatch) {
      currentSuffix = cardMatch[1]
      continue
    }

    const txMatch = TXN_REGEX.exec(line)
    if (!txMatch) {
      TXN_REGEX.lastIndex = 0
      continue
    }
    TXN_REGEX.lastIndex = 0

    const [, day, monStr, year, desc, amountRaw] = txMatch

    // Skip credits (payments): amount starts with "+"
    if (amountRaw.trimStart().startsWith("+")) continue

    const descClean = desc.trim()
    if (/^PAGAMENTO/i.test(descClean)) continue

    const month = MONTH_MAP[monStr.toLowerCase()]
    const date = `${year}-${month}-${day.padStart(2, "0")}`
    const amount = parseAmount(amountRaw)

    if (isNaN(amount) || amount <= 0) continue

    transactions.push({
      date,
      description: descClean,
      amount,
      category: categorize(descClean),
      cardSuffix: currentSuffix,
    })
  }

  if (!referenceMonth && transactions.length > 0) {
    referenceMonth = transactions[0].date.slice(0, 7)
  }

  return { bank: "inter", referenceMonth, transactions }
}
