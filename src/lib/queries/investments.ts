import { db } from "@/db/index"
import {
  investmentReports,
  investmentHoldings,
  investmentReturnsHistory,
  investmentAllocationHistory,
  investmentEvents,
  investmentLiquidity,
  investmentAccounts,
} from "@/db/schema"
import { eq, and, inArray, desc, asc, sql } from "drizzle-orm"

// ── helpers ────────────────────────────────────────────

function accountFilter(
  table: { userId: typeof investmentReports.userId; accountId: typeof investmentReports.accountId },
  userId: string,
  accountIds?: string[]
) {
  if (accountIds && accountIds.length > 0) {
    return and(eq(table.userId, userId), inArray(table.accountId, accountIds))
  }
  return eq(table.userId, userId)
}

// ── exported queries ───────────────────────────────────

export async function getInvestmentAccounts(userId: string) {
  return db
    .select()
    .from(investmentAccounts)
    .where(eq(investmentAccounts.userId, userId))
    .orderBy(asc(investmentAccounts.createdAt))
}

export async function getLatestReferenceMonth(userId: string, accountIds?: string[]): Promise<string | null> {
  const rows = await db
    .select({ referenceMonth: investmentReports.referenceMonth })
    .from(investmentReports)
    .where(accountFilter(investmentReports, userId, accountIds))
    .orderBy(desc(investmentReports.referenceMonth))
    .limit(1)
  return rows[0]?.referenceMonth ?? null
}

export async function getKpisForMonth(userId: string, referenceMonth: string, accountIds?: string[]) {
  const rows = await db
    .select()
    .from(investmentReports)
    .where(
      and(
        accountFilter(investmentReports, userId, accountIds),
        eq(investmentReports.referenceMonth, referenceMonth)
      )
    )

  if (rows.length === 0) return null

  // Aggregate across accounts (sum patrimony, gains; weighted-avg for pct)
  let patrimony = 0
  let previousPatrimony = 0
  let gainsMonth = 0
  let totalContributed = 0
  let weightedReturnMonth = 0
  let weightedReturnYear = 0
  let weightedReturnInception = 0

  for (const r of rows) {
    const pat = parseFloat(r.patrimony ?? "0")
    patrimony += pat
    previousPatrimony += parseFloat(r.previousPatrimony ?? "0")
    gainsMonth += parseFloat(r.gainsMonth ?? "0")
    totalContributed += parseFloat(r.totalContributed ?? "0")
    weightedReturnMonth += parseFloat(r.returnMonthPct ?? "0") * pat
    weightedReturnYear += parseFloat(r.returnYearPct ?? "0") * pat
    weightedReturnInception += parseFloat(r.returnInceptionPct ?? "0") * pat
  }

  return {
    patrimony,
    previousPatrimony,
    gainsMonth,
    totalContributed,
    returnMonthPct: patrimony > 0 ? weightedReturnMonth / patrimony : 0,
    returnYearPct: patrimony > 0 ? weightedReturnYear / patrimony : 0,
    returnInceptionPct: patrimony > 0 ? weightedReturnInception / patrimony : 0,
  }
}

export async function getReturnsHistory(userId: string, accountIds?: string[]) {
  const filter = accountIds && accountIds.length > 0
    ? and(eq(investmentReturnsHistory.userId, userId), inArray(investmentReturnsHistory.accountId, accountIds))
    : eq(investmentReturnsHistory.userId, userId)

  const rows = await db
    .select()
    .from(investmentReturnsHistory)
    .where(filter)
    .orderBy(asc(investmentReturnsHistory.referenceMonth))

  // Aggregate by month when multiple accounts (weight by portfolio value would need patrimony join; use simple average for now)
  const byMonth = new Map<string, { portfolioSum: number; cdiSum: number; count: number }>()
  for (const r of rows) {
    const key = r.referenceMonth
    const existing = byMonth.get(key) ?? { portfolioSum: 0, cdiSum: 0, count: 0 }
    existing.portfolioSum += parseFloat(r.portfolioPct ?? "0")
    existing.cdiSum += parseFloat(r.cdiPct ?? "0")
    existing.count++
    byMonth.set(key, existing)
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([referenceMonth, v]) => ({
      referenceMonth,
      portfolioPct: v.portfolioSum / v.count,
      cdiPct: v.cdiSum / v.count,
    }))
}

export async function getPatrimonyHistory(userId: string, accountIds?: string[]) {
  const rows = await db
    .select({
      referenceMonth: investmentReports.referenceMonth,
      patrimony: sql<string>`sum(${investmentReports.patrimony})`,
      totalContributed: sql<string>`sum(${investmentReports.totalContributed})`,
    })
    .from(investmentReports)
    .where(accountFilter(investmentReports, userId, accountIds))
    .groupBy(investmentReports.referenceMonth)
    .orderBy(asc(investmentReports.referenceMonth))

  return rows.map((r) => ({
    referenceMonth: r.referenceMonth,
    patrimony: parseFloat(r.patrimony ?? "0"),
    totalContributed: parseFloat(r.totalContributed ?? "0"),
  }))
}

export async function getCurrentAllocation(userId: string, referenceMonth: string, accountIds?: string[]) {
  // Get report IDs for the month
  const reports = await db
    .select({ id: investmentReports.id, patrimony: investmentReports.patrimony })
    .from(investmentReports)
    .where(
      and(
        accountFilter(investmentReports, userId, accountIds),
        eq(investmentReports.referenceMonth, referenceMonth)
      )
    )

  if (reports.length === 0) return []

  const totalPatrimony = reports.reduce((s, r) => s + parseFloat(r.patrimony ?? "0"), 0)
  const reportIds = reports.map((r) => r.id)

  // Sum balance per strategy
  const holdings = await db
    .select({
      strategy: investmentHoldings.strategy,
      totalBalance: sql<string>`sum(${investmentHoldings.balance})`,
    })
    .from(investmentHoldings)
    .where(inArray(investmentHoldings.reportId, reportIds))
    .groupBy(investmentHoldings.strategy)

  return holdings.map((h) => {
    const value = parseFloat(h.totalBalance ?? "0")
    return {
      strategy: h.strategy,
      value,
      pct: totalPatrimony > 0 ? (value / totalPatrimony) * 100 : 0,
    }
  })
}

export async function getAllocationHistory(userId: string, accountIds?: string[], months = 6) {
  const filter = accountIds && accountIds.length > 0
    ? and(eq(investmentAllocationHistory.userId, userId), inArray(investmentAllocationHistory.accountId, accountIds))
    : eq(investmentAllocationHistory.userId, userId)

  const rows = await db
    .select()
    .from(investmentAllocationHistory)
    .where(filter)
    .orderBy(asc(investmentAllocationHistory.referenceMonth))

  // Aggregate: when multiple accounts, average pct (simple; for weighted need patrimony join)
  const byMonthStrategy = new Map<string, { sum: number; count: number }>()
  for (const r of rows) {
    const key = `${r.referenceMonth}||${r.strategy}`
    const existing = byMonthStrategy.get(key) ?? { sum: 0, count: 0 }
    existing.sum += parseFloat(r.pct ?? "0")
    existing.count++
    byMonthStrategy.set(key, existing)
  }

  const allMonths = Array.from(new Set(rows.map((r) => r.referenceMonth))).sort()
  const recentMonths = allMonths.slice(-months)

  const result: { referenceMonth: string; strategy: string; pct: number }[] = []
  for (const [key, v] of byMonthStrategy.entries()) {
    const [referenceMonth, strategy] = key.split("||")
    if (!recentMonths.includes(referenceMonth)) continue
    result.push({ referenceMonth, strategy, pct: v.sum / v.count })
  }

  return result.sort((a, b) => a.referenceMonth.localeCompare(b.referenceMonth))
}

export async function getHoldings(userId: string, referenceMonth: string, accountIds?: string[]) {
  const reports = await db
    .select({ id: investmentReports.id })
    .from(investmentReports)
    .where(
      and(
        accountFilter(investmentReports, userId, accountIds),
        eq(investmentReports.referenceMonth, referenceMonth)
      )
    )

  if (reports.length === 0) return []

  const reportIds = reports.map((r) => r.id)

  return db
    .select()
    .from(investmentHoldings)
    .where(inArray(investmentHoldings.reportId, reportIds))
    .orderBy(asc(investmentHoldings.strategy), desc(investmentHoldings.balance))
}

export async function getLiquidity(userId: string, referenceMonth: string, accountIds?: string[]) {
  const reports = await db
    .select({ id: investmentReports.id, patrimony: investmentReports.patrimony })
    .from(investmentReports)
    .where(
      and(
        accountFilter(investmentReports, userId, accountIds),
        eq(investmentReports.referenceMonth, referenceMonth)
      )
    )

  if (reports.length === 0) return []

  const reportIds = reports.map((r) => r.id)
  const totalPatrimony = reports.reduce((s, r) => s + parseFloat(r.patrimony ?? "0"), 0)

  const rows = await db
    .select({
      bucket: investmentLiquidity.bucket,
      totalAmount: sql<string>`sum(${investmentLiquidity.amount})`,
    })
    .from(investmentLiquidity)
    .where(inArray(investmentLiquidity.reportId, reportIds))
    .groupBy(investmentLiquidity.bucket)

  const BUCKET_ORDER = ["0_1", "2_5", "6_15", "16_30", "31_90", "91_180", "more_180"]

  return rows
    .map((r) => {
      const amount = parseFloat(r.totalAmount ?? "0")
      return {
        bucket: r.bucket,
        amount,
        pct: totalPatrimony > 0 ? (amount / totalPatrimony) * 100 : 0,
      }
    })
    .sort((a, b) => BUCKET_ORDER.indexOf(a.bucket) - BUCKET_ORDER.indexOf(b.bucket))
}

export async function getEventsTimeline(userId: string, accountIds?: string[], months = 24) {
  // Get report IDs for the last N months
  const reportsFilter = accountIds && accountIds.length > 0
    ? and(eq(investmentReports.userId, userId), inArray(investmentReports.accountId, accountIds))
    : eq(investmentReports.userId, userId)

  const reports = await db
    .select({ id: investmentReports.id, referenceMonth: investmentReports.referenceMonth })
    .from(investmentReports)
    .where(reportsFilter)
    .orderBy(desc(investmentReports.referenceMonth))
    .limit(months)

  if (reports.length === 0) return []

  const reportIds = reports.map((r) => r.id)
  const monthByReportId = new Map(reports.map((r) => [r.id, r.referenceMonth]))

  const events = await db
    .select()
    .from(investmentEvents)
    .where(inArray(investmentEvents.reportId, reportIds))

  // Group by referenceMonth → sum amounts
  const byMonth = new Map<string, number>()
  for (const e of events) {
    const month = monthByReportId.get(e.reportId) ?? ""
    if (!month) continue
    byMonth.set(month, (byMonth.get(month) ?? 0) + parseFloat(e.amount ?? "0"))
  }

  const sorted = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b))
  let cumulative = 0
  return sorted.map(([referenceMonth, value]) => {
    cumulative += value
    return { referenceMonth, value, cumulative }
  })
}
