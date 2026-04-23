"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CardSelector } from "./card-selector"
import { MonthSelector } from "./month-selector"
import { MonthlyEvolutionChart } from "./charts/monthly-evolution-chart"
import { CategoryDistributionChart } from "./charts/category-distribution-chart"
import { MonthComparisonChart } from "./charts/month-comparison-chart"
import { WeekdayChart } from "./charts/weekday-chart"
import { TopMerchantsCard } from "./top-merchants-card"
import { SubscriptionsCard } from "./subscriptions-card"
import { OutliersCard } from "./outliers-card"
import { InstallmentsCard } from "./installments-card"
import { BudgetProgressCard } from "./budget-progress-card"
import { CardList } from "@/components/cards/card-list"
import { currentReferenceMonth, projectMonthEnd } from "@/lib/analytics"
import type { Category } from "@/components/transactions/categories"

export interface CardItem {
  id: string
  name: string
  bankCode: string
  color: string
  createdAt: string
}

export interface TransactionItem {
  id: string
  cardId: string | undefined
  amount: number
  category: Category
  referenceMonth: string
  description: string
  txnDate: string
}

interface DashboardClientProps {
  cards: CardItem[]
  transactions: TransactionItem[]
  budgets: Array<{ category: Category; monthlyLimit: number }>
  monthlyIncome: number | null
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export function DashboardClient({
  cards,
  transactions,
  budgets,
  monthlyIncome,
}: DashboardClientProps) {
  const router = useRouter()
  const [selectedCardId, setSelectedCardId] = useState("all")

  const availableMonths = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.referenceMonth))).sort(),
    [transactions]
  )
  const [selectedMonths, setSelectedMonths] = useState<string[]>(availableMonths)

  const filtered = transactions
    .filter((t) => selectedCardId === "all" || t.cardId === selectedCardId)
    .filter((t) => selectedMonths.length === 0 || selectedMonths.includes(t.referenceMonth))

  const total = filtered.reduce((sum, t) => sum + t.amount, 0)
  const necessario = filtered
    .filter((t) => t.category === "necessario")
    .reduce((sum, t) => sum + t.amount, 0)
  const superfluo = filtered
    .filter((t) => t.category === "superfluo")
    .reduce((sum, t) => sum + t.amount, 0)
  const investimento = filtered
    .filter((t) => t.category === "investimento")
    .reduce((sum, t) => sum + t.amount, 0)

  const realizedByCategory: Record<Category, number> = {
    necessario,
    superfluo,
    investimento,
  }

  // Build monthly evolution chart data (consolidated total per month)
  const monthsSet = new Set(filtered.map((t) => t.referenceMonth))
  const months = Array.from(monthsSet).sort()
  const chartData = months.map((month) => ({
    month,
    total: filtered
      .filter((t) => t.referenceMonth === month)
      .reduce((sum, t) => sum + t.amount, 0),
  }))

  const categoryData = { necessario, superfluo, investimento }

  // Month comparison chart
  const comparisonData = [...selectedMonths].sort().map((month) => {
    const monthTxs = filtered.filter((t) => t.referenceMonth === month)
    return {
      month,
      necessario: monthTxs.filter((t) => t.category === "necessario").reduce((s, t) => s + t.amount, 0),
      superfluo: monthTxs.filter((t) => t.category === "superfluo").reduce((s, t) => s + t.amount, 0),
      investimento: monthTxs.filter((t) => t.category === "investimento").reduce((s, t) => s + t.amount, 0),
    }
  })

  // Average ticket
  const avgTicket = filtered.length === 0 ? 0 : total / filtered.length

  // Daily average
  const today = new Date()
  const currentMonth = currentReferenceMonth(today)
  const daysInCurrent = today.getDate()
  const dailyAvg = useMemo(() => {
    if (filtered.length === 0) return 0
    if (selectedMonths.length === 1 && selectedMonths[0] === currentMonth) {
      return total / Math.max(daysInCurrent, 1)
    }
    if (selectedMonths.length === 0) return 0
    const totalDays = selectedMonths.reduce((sum, ym) => {
      if (ym === currentMonth) return sum + daysInCurrent
      const [y, m] = ym.split("-").map(Number)
      const last = new Date(y, m, 0).getDate()
      return sum + last
    }, 0)
    return totalDays === 0 ? 0 : total / totalDays
  }, [filtered.length, selectedMonths, total, daysInCurrent, currentMonth])

  // Projection for current month
  const includesCurrentMonth = selectedMonths.includes(currentMonth)
  const currentMonthTotal = filtered
    .filter((t) => t.referenceMonth === currentMonth)
    .reduce((sum, t) => sum + t.amount, 0)
  const projection = includesCurrentMonth ? projectMonthEnd(currentMonthTotal, today) : null

  // % da renda comprometida (referente ao mês atual se selecionado)
  const incomeCommittedPct =
    monthlyIncome && monthlyIncome > 0 && includesCurrentMonth
      ? (currentMonthTotal / monthlyIncome) * 100
      : null

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Visão geral das suas finanças pessoais.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthSelector
            months={availableMonths}
            selected={selectedMonths}
            onChange={setSelectedMonths}
          />
          <CardSelector
            cards={cards}
            value={selectedCardId}
            onChange={setSelectedCardId}
          />
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardDescription>Gasto total</CardDescription>
            <CardTitle className="text-2xl">{currencyFormatter.format(total)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {filtered.length === 0
                ? "Nenhum dado ainda. Faça upload de uma fatura."
                : `${filtered.length} transações`}
            </p>
            {projection ? (
              <p className="text-xs text-muted-foreground">
                Projeção fim do mês:{" "}
                <span className="font-medium text-foreground">
                  {currencyFormatter.format(projection.projected)}
                </span>{" "}
                <span className="text-muted-foreground">
                  ({projection.elapsed}/{projection.total} dias)
                </span>
              </p>
            ) : null}
            {incomeCommittedPct !== null ? (
              <p className="text-xs text-muted-foreground">
                {incomeCommittedPct.toFixed(0)}% da renda (
                {currencyFormatter.format(monthlyIncome ?? 0)})
              </p>
            ) : monthlyIncome === null ? (
              <p className="text-xs text-muted-foreground">
                <Link href="/settings" className="underline underline-offset-2">
                  Configurar renda
                </Link>{" "}
                para ver % comprometido
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Necessário</CardDescription>
            <CardTitle className="text-xl text-emerald-600">
              {currencyFormatter.format(necessario)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Essenciais</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Supérfluo</CardDescription>
            <CardTitle className="text-xl text-amber-600">
              {currencyFormatter.format(superfluo)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Não essenciais</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Investimento</CardDescription>
            <CardTitle className="text-xl text-blue-600">
              {currencyFormatter.format(investimento)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Aportes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ticket médio</CardDescription>
            <CardTitle className="text-xl">
              {filtered.length === 0 ? "—" : currencyFormatter.format(avgTicket)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Por transação</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Média diária</CardDescription>
            <CardTitle className="text-xl">
              {dailyAvg === 0 ? "—" : currencyFormatter.format(dailyAvg)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">No período</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução das faturas</CardTitle>
            <CardDescription>Total por mês — passe o mouse para ver a variação</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyEvolutionChart data={chartData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por categoria</CardTitle>
            <CardDescription>Necessário vs supérfluo vs investimento</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryDistributionChart data={categoryData} />
          </CardContent>
        </Card>
      </div>

      {/* Month comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Comparação entre meses</CardTitle>
          <CardDescription>Gastos por categoria em cada mês selecionado</CardDescription>
        </CardHeader>
        <CardContent>
          <MonthComparisonChart data={comparisonData} />
        </CardContent>
      </Card>

      {/* Budgets + Outliers */}
      <div className="grid gap-4 md:grid-cols-2">
        <BudgetProgressCard initial={budgets} realized={realizedByCategory} />
        <OutliersCard transactions={filtered} />
      </div>

      {/* Top merchants + Weekday */}
      <div className="grid gap-4 md:grid-cols-2">
        <TopMerchantsCard transactions={filtered} />
        <WeekdayChart transactions={filtered} />
      </div>

      {/* Subscriptions + Installments */}
      <div className="grid gap-4 md:grid-cols-2">
        <SubscriptionsCard transactions={filtered} />
        <InstallmentsCard transactions={filtered} />
      </div>

      {/* Card management */}
      <Card>
        <CardHeader>
          <CardTitle>Gestão de cartões</CardTitle>
          <CardDescription>Seus cartões cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          <CardList
            cards={cards}
            loading={false}
            onRefresh={() => router.refresh()}
          />
        </CardContent>
      </Card>
    </div>
  )
}
