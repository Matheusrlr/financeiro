// Parser for Inter Prime consolidated investment report PDFs

export interface ParsedInvestmentReport {
  bank: "inter"
  referenceMonth: string         // "YYYY-MM"
  inceptionDate: string          // "YYYY-MM-DD"
  summary: {
    patrimony: number
    previousPatrimony: number
    contributions: number
    withdrawals: number
    financialEvents: number
    gainsMonth: number
    returnMonthPct: number
    returnYearPct: number
    returnInceptionPct: number
    totalContributed: number
  }
  allocationCurrent: { strategy: string; pct: number }[]
  allocationHistory: { referenceMonth: string; strategy: string; pct: number }[]
  returnsHistory: { referenceMonth: string; portfolioPct: number; cdiPct: number }[]
  holdings: {
    strategy: string
    assetName: string
    ticker?: string
    previousBalance: number
    contributions: number
    withdrawals: number
    events: number
    balance: number
    returnMonthPct: number
    return12mPct: number
    returnInceptionPct: number
    sharePct: number
    isTaxExempt: boolean
  }[]
  events: {
    eventDate: string  // "YYYY-MM-DD"
    ticker?: string
    eventType: string  // canonical type
    amount: number
  }[]
  liquidity: { bucket: string; amount: number; pct: number }[]
}

// ── helpers ────────────────────────────────────────────

const PT_MONTHS: Record<string, number> = {
  janeiro: 1, fevereiro: 2, março: 3, marco: 3,
  abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8,
  setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
}

const PT_MONTHS_SHORT: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
}

function parseBrNumber(s: string): number {
  // "1.234,56" or "1.234" or "1,76"
  const clean = s.replace(/\./g, "").replace(",", ".")
  return parseFloat(clean) || 0
}

function parseBrDate(s: string): string {
  // "DD/MM/YYYY" → "YYYY-MM-DD"
  const m = s.match(/(\d{1,2})\/(\d{2})\/(\d{4})/)
  if (!m) return ""
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
}

function parsePtLongDate(s: string): string {
  // "9 de Março de 2026" → "2026-03-09"
  const m = s.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i)
  if (!m) return ""
  const month = PT_MONTHS[m[2].toLowerCase()] ?? PT_MONTHS_SHORT[m[2].toLowerCase().slice(0, 3)]
  if (!month) return ""
  return `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`
}

function parseShortMonth(s: string): string {
  // "Out/25" or "Mar/26" → "2025-10" or "2026-03"
  const m = s.match(/^(\w{3})\/(\d{2})$/i)
  if (!m) return ""
  const mo = PT_MONTHS_SHORT[m[1].toLowerCase()]
  if (!mo) return ""
  const year = parseInt(m[2], 10) + 2000
  return `${year}-${String(mo).padStart(2, "0")}`
}

function canonicalEventType(raw: string): string {
  const l = raw.toLowerCase()
  if (l.includes("jcp")) return "jcp"
  if (l.includes("dividendo") || l.includes("dividend")) return "dividendo"
  if (l.includes("rendimento") || l.includes("evento b3") || l.includes("eventos rf")) return "rendimento"
  if (l.includes("fração") || l.includes("fracao") || l.includes("frac")) return "fracao"
  if (l.includes("vencimento")) return "vencimento"
  if (l.includes("resgate")) return "resgate"
  if (l.includes("aplicação") || l.includes("aplicacao") || l.includes("débito") || l.includes("debito")) return "aplicacao"
  return "rendimento"
}

// Strategies recognized in the PDF (Portuguese names)
const STRATEGY_HEADERS = [
  "Liquidez", "Título Público", "Titulo Publico",
  "Pós-fixado", "Pos-fixado", "Pos fixado",
  "Inflação", "Inflacao",
  "Prefixado",
  "Multimercado",
  "Renda Variável", "Renda Variavel",
  "Global",
  "COE",
  "Outros",
]

const STRATEGY_REGEX = new RegExp(`^(${STRATEGY_HEADERS.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*$`, "im")

function normalizeStrategy(s: string): string {
  const map: Record<string, string> = {
    "titulo publico": "Título Público",
    "pos-fixado": "Pós-fixado",
    "pos fixado": "Pós-fixado",
    "inflacao": "Inflação",
    "renda variavel": "Renda Variável",
  }
  const key = s.trim().toLowerCase()
  return map[key] ?? s.trim()
}

// ── summary parsing ────────────────────────────────────

function parseSummary(text: string) {
  const rBrValue = /R\$\s*([\d.,]+)/

  function findAfterLabel(label: RegExp): number {
    const m = text.match(label)
    if (!m || m.index === undefined) return 0
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 80)
    const v = after.match(/R\$\s*([\d.,]+)/)
    return v ? parseBrNumber(v[1]) : 0
  }

  function findPct(label: RegExp): number {
    const m = text.match(label)
    if (!m || m.index === undefined) return 0
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 120)
    const v = after.match(/([\d.,]+)\s*%/)
    return v ? parseBrNumber(v[1]) : 0
  }

  // Patrimônio: "Patrimônio em DD/MM/YYYY\nR$ X"
  let patrimony = 0
  let previousPatrimony = 0
  let inceptionDate = ""

  const patrimonioMatch = text.match(/Patrim[oô]nio\s+em\s+(\d{2}\/\d{2}\/\d{4})\s*\n?\s*R\$\s*([\d.,]+)/i)
  if (patrimonioMatch) {
    patrimony = parseBrNumber(patrimonioMatch[2])
  }

  // Previous patrimony: "R$ X.XXX,XX em DD/MM/YYYY" on the next line after patrimony
  const prevMatch = text.match(/R\$\s*([\d.,]+)\s+em\s+\d{2}\/\d{2}\/\d{4}\s/)
  if (prevMatch) {
    previousPatrimony = parseBrNumber(prevMatch[1])
  }

  // Inception date: "desde DD/MM/YYYY" or "desde o início (DD/MM/YYYY)"
  const inceptionMatch = text.match(/desde\s+(?:o\s+in[ií]cio\s*\()?(\d{2}\/\d{2}\/\d{4})/i)
  if (inceptionMatch) inceptionDate = parseBrDate(inceptionMatch[1])

  const contributions = findAfterLabel(/Aplica[cç][oõ]es?\s+no\s+m[eê]s/i)
  const withdrawals = findAfterLabel(/Resgates?\s+no\s+m[eê]s|Resgates/i)
  const financialEvents = findAfterLabel(/Eventos?\s+financeiros?/i)
  const gainsMonth = findAfterLabel(/Ganhos?\s+financeiros?/i)

  // Return percentages
  const returnMonthPct = findPct(/Rentabilidade\s+no\s+m[eê]s/i)
  const returnYearPct = findPct(/Rentabilidade\s+no\s+ano/i)
  const returnInceptionPct = findPct(/Rentabilidade\s+desde\s+o\s+in[ií]cio/i)

  // Total contributed
  const totalContributed = findAfterLabel(/Total\s+aplicado|Total\s+investido/i)

  return {
    patrimony,
    previousPatrimony,
    contributions,
    withdrawals,
    financialEvents,
    gainsMonth,
    returnMonthPct,
    returnYearPct,
    returnInceptionPct,
    totalContributed,
    inceptionDate,
  }
}

// ── returns history ────────────────────────────────────

function parseReturnsHistory(text: string): { referenceMonth: string; portfolioPct: number; cdiPct: number }[] {
  // Table "Rentabilidades Mensais da Carteira (%)"
  // Lines like: "2021 -0,07 0,19 0,20 0,17 0,27 0,16 -1,24 0,34 0,33 1,27 0,79 0,80  3,00"
  // Followed by lines with "% do CDI": "% do CDI 0,00 0,00 ... "
  const results: { referenceMonth: string; portfolioPct: number; cdiPct: number }[] = []

  // Find the section
  const sectionMatch = text.match(/Rentabilidades?\s+Mensais?\s+da\s+Carteira/i)
  if (!sectionMatch || sectionMatch.index === undefined) return results

  const section = text.slice(sectionMatch.index, sectionMatch.index + 8000)
  const lines = section.split("\n")

  // Year rows: lines starting with 4-digit year
  const yearRows: { year: number; values: string[]; lineIdx: number }[] = []
  let cdiRows: { year: number; values: string[] }[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const yearMatch = line.match(/^(20\d{2})\s+(.+)$/)
    if (yearMatch) {
      const vals = yearMatch[2].trim().split(/\s+/)
      yearRows.push({ year: parseInt(yearMatch[1], 10), values: vals, lineIdx: i })
    }
  }

  // CDI rows come after the portfolio rows, often labelled "% do CDI"
  // They may appear inline or in a separate block. Strategy: look for lines
  // after yearRows with same number of numeric tokens
  // Simpler: find lines starting with "% do CDI" or a CDI header row
  const cdiSection = section.match(/(?:%\s*do\s*CDI|CDI)\s*[\r\n]([\s\S]+?)(?:\n\n|$)/i)

  if (cdiSection) {
    const cdiBlock = cdiSection[1]
    const cdiLines = cdiBlock.split("\n")
    for (const line of cdiLines) {
      const yearMatch = line.trim().match(/^(20\d{2})\s+(.+)$/)
      if (yearMatch) {
        const vals = yearMatch[2].trim().split(/\s+/)
        cdiRows.push({ year: parseInt(yearMatch[1], 10), values: vals })
      }
    }
  }

  // Build cdiMap: year-month → cdiPct
  const cdiMap = new Map<string, number>()
  for (const row of cdiRows) {
    // values: jan feb mar apr ... dec [year_total]
    for (let m = 0; m < Math.min(row.values.length, 12); m++) {
      const key = `${row.year}-${String(m + 1).padStart(2, "0")}`
      cdiMap.set(key, parseBrNumber(row.values[m]))
    }
  }

  // Portfolio rows: values have up to 14 items (12 months + 2 totals), skip last 2
  for (const row of yearRows) {
    const monthVals = row.values.slice(0, 12)
    for (let m = 0; m < monthVals.length; m++) {
      const val = monthVals[m]
      if (val === "-" || val === "" || val === "—") continue
      const portfolioPct = parseBrNumber(val)
      const key = `${row.year}-${String(m + 1).padStart(2, "0")}`
      const cdiPct = cdiMap.get(key) ?? 0
      results.push({ referenceMonth: key, portfolioPct, cdiPct })
    }
  }

  return results
}

// ── allocation history ─────────────────────────────────

function parseAllocationHistory(text: string): {
  current: { strategy: string; pct: number }[]
  history: { referenceMonth: string; strategy: string; pct: number }[]
} {
  const current: { strategy: string; pct: number }[] = []
  const history: { referenceMonth: string; strategy: string; pct: number }[] = []

  // Find "Evolução de alocação de ativos" section
  const sectionMatch = text.match(/Evolu[cç][aã]o\s+de\s+aloca[cç][aã]o\s+de\s+ativos/i)
  if (!sectionMatch || sectionMatch.index === undefined) return { current, history }

  const section = text.slice(sectionMatch.index, sectionMatch.index + 4000)
  const lines = section.split("\n")

  // Find header line with month labels: "Out/25 Nov/25 Dez/25 Jan/26 Fev/26 Mar/26"
  let months: string[] = []
  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].trim().split(/\s+/)
    const parsed = parts.map(parseShortMonth).filter(Boolean)
    if (parsed.length >= 3) {
      months = parsed
      headerIdx = i
      break
    }
  }

  if (headerIdx === -1 || months.length === 0) return { current, history }

  // Subsequent lines: "<strategy> <pct1> ... <pctN>"
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    // Stop at blank or next major section
    const parts = line.split(/\s+/)
    // Strategy name might be multi-word; numerics at the end
    const numericSuffix: number[] = []
    const nameParts: string[] = []
    for (const p of parts) {
      if (/^[\d.,]+$/.test(p)) {
        numericSuffix.push(parseBrNumber(p))
      } else {
        nameParts.push(p)
      }
    }
    if (numericSuffix.length === 0 || nameParts.length === 0) continue
    const strategy = normalizeStrategy(nameParts.join(" "))

    // Align numerics with months
    for (let j = 0; j < Math.min(numericSuffix.length, months.length); j++) {
      history.push({ referenceMonth: months[j], strategy, pct: numericSuffix[j] })
    }
    // Last month = current allocation
    if (months.length > 0 && numericSuffix.length > 0) {
      current.push({ strategy, pct: numericSuffix[numericSuffix.length - 1] })
    }
  }

  return { current, history }
}

// ── holdings ───────────────────────────────────────────

function parseHoldings(text: string) {
  const holdings: ParsedInvestmentReport["holdings"] = []

  // Find holdings section (starts after "Composição da Carteira" or "Carteira Detalhada")
  const sectionMatch = text.match(/Composi[cç][aã]o\s+da\s+Carteira|Carteira\s+Detalhada|Ativos\s+da\s+Carteira/i)
  if (!sectionMatch || sectionMatch.index === undefined) return holdings

  const section = text.slice(sectionMatch.index, sectionMatch.index + 40000)
  const lines = section.split("\n")

  let currentStrategy = ""

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Check if this line is a strategy header
    const stratMatch = line.match(STRATEGY_REGEX)
    if (stratMatch) {
      currentStrategy = normalizeStrategy(stratMatch[1])
      continue
    }

    // Skip subtotal / total lines
    if (/^(Sub-?total|Total\s+da|TOTAL)\b/i.test(line)) continue

    // Try to parse as a holding row
    // Format: "<name> [Isento] <prev> <contrib> <resgate> <event> <saldo> <%mes> <%12m> <%inicio> <%part>"
    // All numbers can be negative (represented as "-X,XX" or "X,XX" for positive)
    // We need at least 9 numeric values at the end
    const parts = line.split(/\s+/)
    const numericParts: number[] = []
    const textParts: string[] = []
    let isTaxExempt = false

    for (const p of parts) {
      if (p === "Isento" || p === "ISENTO") {
        isTaxExempt = true
      } else if (/^-?[\d.,]+$/.test(p)) {
        numericParts.push(parseBrNumber(p))
      } else {
        textParts.push(p)
      }
    }

    // Holdings have exactly 9 numeric columns (prev, contrib, withdraw, events, balance, ret_month, ret_12m, ret_inception, share)
    if (numericParts.length < 9 || textParts.length === 0 || !currentStrategy) continue

    const assetName = textParts.join(" ")

    // Extract ticker if present: typically an uppercase code 4-6 chars optionally followed by digits
    const tickerMatch = assetName.match(/\b([A-Z]{4}\d{1,2})\b/)
    const ticker = tickerMatch?.[1]

    const offset = numericParts.length - 9
    holdings.push({
      strategy: currentStrategy,
      assetName,
      ticker,
      previousBalance: numericParts[offset + 0],
      contributions: numericParts[offset + 1],
      withdrawals: numericParts[offset + 2],
      events: numericParts[offset + 3],
      balance: numericParts[offset + 4],
      returnMonthPct: numericParts[offset + 5],
      return12mPct: numericParts[offset + 6],
      returnInceptionPct: numericParts[offset + 7],
      sharePct: numericParts[offset + 8],
      isTaxExempt,
    })
  }

  return holdings
}

// ── events ─────────────────────────────────────────────

function parseEvents(text: string): ParsedInvestmentReport["events"] {
  const events: ParsedInvestmentReport["events"] = []

  // Find "Movimentações no mês" section
  const sectionMatch = text.match(/Movimenta[cç][oõ]es?\s+no\s+m[eê]s/i)
  if (!sectionMatch || sectionMatch.index === undefined) return events

  const section = text.slice(sectionMatch.index, sectionMatch.index + 8000)
  const lines = section.split("\n")

  let currentDate = ""

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Date line: "9 de Março de 2026"
    const dateMatch = trimmed.match(/^\d{1,2}\s+de\s+\w+\s+de\s+\d{4}$/i)
    if (dateMatch) {
      currentDate = parsePtLongDate(trimmed)
      continue
    }

    // Event line: "<type> [ticker] R$ X.XXX,XX"
    const eventMatch = trimmed.match(/^(.+?)\s+R\$\s+([\d.,]+)\s*$/)
    if (eventMatch && currentDate) {
      const rawType = eventMatch[1].trim()
      const amount = parseBrNumber(eventMatch[2])
      const eventType = canonicalEventType(rawType)

      // Try to extract ticker from type description
      const tickerMatch = rawType.match(/\b([A-Z]{4}\d{1,2})\b/)

      events.push({
        eventDate: currentDate,
        ticker: tickerMatch?.[1],
        eventType,
        amount,
      })
    }
  }

  return events
}

// ── liquidity ──────────────────────────────────────────

const LIQUIDITY_BUCKETS = ["0_1", "2_5", "6_15", "16_30", "31_90", "91_180", "more_180"]
const LIQUIDITY_LABELS = ["D+0 a D+1", "D+2 a D+5", "D+6 a D+15", "D+16 a D+30", "D+31 a D+90", "D+91 a D+180", "Acima de D+180"]

function parseLiquidity(text: string): ParsedInvestmentReport["liquidity"] {
  const liquidity: ParsedInvestmentReport["liquidity"] = []

  const sectionMatch = text.match(/Análise\s+da\s+Disponibilidade\s+Financeira|An[aá]lise\s+de\s+Liquidez/i)
  if (!sectionMatch || sectionMatch.index === undefined) return liquidity

  const section = text.slice(sectionMatch.index, sectionMatch.index + 3000)
  const lines = section.split("\n")

  let bucketIdx = 0
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || bucketIdx >= LIQUIDITY_BUCKETS.length) continue

    // Match lines with R$ value and percentage
    const m = trimmed.match(/R\$\s*([\d.,]+)\s+([\d.,]+)%/)
    if (m) {
      liquidity.push({
        bucket: LIQUIDITY_BUCKETS[bucketIdx],
        amount: parseBrNumber(m[1]),
        pct: parseBrNumber(m[2]),
      })
      bucketIdx++
    }
  }

  return liquidity
}

// ── reference month ────────────────────────────────────

function parseReferenceMonth(text: string): string {
  // "Relatório de Março/2026" or "Referência: Março/2026" or similar
  const m = text.match(/(?:Relat[oó]rio|Refer[eê]ncia)[^\n]{0,30}?(\w+)\/(\d{4})/i)
  if (m) {
    const mo = PT_MONTHS[m[1].toLowerCase()] ?? PT_MONTHS_SHORT[m[1].toLowerCase().slice(0, 3)]
    if (mo) return `${m[2]}-${String(mo).padStart(2, "0")}`
  }

  // Fallback: "Patrimônio em DD/MM/YYYY" → infer month from that date
  const dateMatch = text.match(/Patrim[oô]nio\s+em\s+(\d{2})\/(\d{2})\/(\d{4})/i)
  if (dateMatch) return `${dateMatch[3]}-${dateMatch[2]}`

  return new Date().toISOString().slice(0, 7)
}

// ── main export ────────────────────────────────────────

export function parseInvestmentReportInter(text: string): ParsedInvestmentReport {
  const summaryData = parseSummary(text)
  const referenceMonth = parseReferenceMonth(text)
  const { current: allocationCurrent, history: allocationHistory } = parseAllocationHistory(text)
  const returnsHistory = parseReturnsHistory(text)
  const holdings = parseHoldings(text)
  const events = parseEvents(text)
  const liquidity = parseLiquidity(text)

  return {
    bank: "inter",
    referenceMonth,
    inceptionDate: summaryData.inceptionDate,
    summary: {
      patrimony: summaryData.patrimony,
      previousPatrimony: summaryData.previousPatrimony,
      contributions: summaryData.contributions,
      withdrawals: summaryData.withdrawals,
      financialEvents: summaryData.financialEvents,
      gainsMonth: summaryData.gainsMonth,
      returnMonthPct: summaryData.returnMonthPct,
      returnYearPct: summaryData.returnYearPct,
      returnInceptionPct: summaryData.returnInceptionPct,
      totalContributed: summaryData.totalContributed,
    },
    allocationCurrent,
    allocationHistory,
    returnsHistory,
    holdings,
    events,
    liquidity,
  }
}
