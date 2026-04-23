export type AnalyticsTx = {
  id: string
  description: string
  amount: number
  category: "necessario" | "superfluo" | "investimento"
  referenceMonth: string
  txnDate: string
  cardId?: string
}

export function monthLabel(ym: string, opts?: { long?: boolean }): string {
  const [year, month] = ym.split("-")
  const date = new Date(Number(year), Number(month) - 1, 1)
  const formatted = date.toLocaleDateString("pt-BR", {
    month: opts?.long ? "long" : "short",
    year: "2-digit",
  })
  return formatted.replace(".", "")
}

export function normalizeMerchant(description: string): string {
  const cleaned = description
    .toUpperCase()
    .replace(/\*.*$/, "")
    .replace(/\d+/g, "")
    .replace(/[^A-ZÀ-Ú\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  const first = cleaned.split(" ")[0]
  return first || description.toUpperCase().trim()
}

export function topMerchants(txs: Array<Pick<AnalyticsTx, "description" | "amount">>, n = 5) {
  const map = new Map<string, { total: number; count: number }>()
  for (const t of txs) {
    const key = normalizeMerchant(t.description)
    const cur = map.get(key) ?? { total: 0, count: 0 }
    map.set(key, { total: cur.total + t.amount, count: cur.count + 1 })
  }
  return [...map.entries()]
    .map(([merchant, v]) => ({ merchant, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n)
}

export function detectSubscriptions(
  txs: Array<Pick<AnalyticsTx, "description" | "amount" | "referenceMonth">>
) {
  const groups = new Map<
    string,
    { merchant: string; amount: number; months: Set<string> }
  >()
  for (const t of txs) {
    const merchant = normalizeMerchant(t.description)
    const key = `${merchant}__${Math.round(t.amount)}`
    const g = groups.get(key) ?? {
      merchant,
      amount: t.amount,
      months: new Set<string>(),
    }
    g.months.add(t.referenceMonth)
    groups.set(key, g)
  }
  return [...groups.values()]
    .filter((g) => g.months.size >= 2)
    .map((g) => ({
      merchant: g.merchant,
      amount: g.amount,
      monthsCount: g.months.size,
    }))
    .sort((a, b) => b.amount - a.amount)
}

export function projectMonthEnd(totalAtual: number, hoje = new Date()) {
  const dia = hoje.getDate()
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()
  if (dia === 0) return null
  return {
    projected: (totalAtual / dia) * ultimoDia,
    elapsed: dia,
    total: ultimoDia,
  }
}

export function currentReferenceMonth(hoje = new Date()): string {
  const year = hoje.getFullYear()
  const month = String(hoje.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

export function spendByWeekday(txs: Array<Pick<AnalyticsTx, "amount" | "txnDate">>) {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
  const totals = Array<number>(7).fill(0)
  for (const t of txs) {
    const [y, m, d] = t.txnDate.split("-").map(Number)
    const dow = new Date(y, m - 1, d).getDay()
    totals[dow] += t.amount
  }
  const order = [1, 2, 3, 4, 5, 6, 0]
  return order.map((i) => ({ day: days[i], total: totals[i] }))
}

export function detectOutliers(txs: AnalyticsTx[], threshold = 2) {
  const byCat = new Map<string, number[]>()
  for (const t of txs) {
    const arr = byCat.get(t.category) ?? []
    arr.push(t.amount)
    byCat.set(t.category, arr)
  }
  const stats = new Map<string, { mean: number; std: number }>()
  for (const [cat, arr] of byCat) {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length
    const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length
    stats.set(cat, { mean, std: Math.sqrt(variance) })
  }
  return txs
    .map((t) => {
      const s = stats.get(t.category)
      if (!s) return null
      const z = s.std === 0 ? 0 : (t.amount - s.mean) / s.std
      const ratio = s.mean === 0 ? 0 : t.amount / s.mean
      return { ...t, z, ratio, categoryMean: s.mean }
    })
    .filter((t): t is AnalyticsTx & { z: number; ratio: number; categoryMean: number } =>
      t !== null && t.z > threshold
    )
    .sort((a, b) => b.z - a.z)
    .slice(0, 5)
}

export function detectInstallments(
  txs: Array<Pick<AnalyticsTx, "id" | "description" | "amount" | "txnDate" | "referenceMonth" | "category">>
) {
  const re = /(?:PARC\.?\s*)?(?:\(|\b)(\d{1,2})\s*(?:\/|DE)\s*(\d{1,2})(?:\)|\b)/i
  return txs
    .map((t) => {
      const m = t.description.match(re)
      if (!m) return null
      const current = Number(m[1])
      const total = Number(m[2])
      if (current < 1 || total < 2 || current > total) return null
      return {
        ...t,
        installment: { current, total },
        remaining: Math.max(0, total - current) * t.amount,
      }
    })
    .filter(
      (t): t is (typeof txs)[number] & {
        installment: { current: number; total: number }
        remaining: number
      } => t !== null
    )
    .sort((a, b) => b.remaining - a.remaining)
}
