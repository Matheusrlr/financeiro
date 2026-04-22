"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
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
import { CardList } from "@/components/cards/card-list"

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
  category: "necessario" | "superfluo" | "investimento"
  referenceMonth: string
}

interface DashboardClientProps {
  cards: CardItem[]
  transactions: TransactionItem[]
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export function DashboardClient({ cards, transactions }: DashboardClientProps) {
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

  // Build monthly evolution chart data
  const monthsSet = new Set(filtered.map((t) => t.referenceMonth))
  const months = Array.from(monthsSet).sort()
  const chartData = months.map((month) => {
    const entry: { month: string; [cardId: string]: number | string } = { month }
    for (const card of cards) {
      entry[card.id] = filtered
        .filter((t) => t.referenceMonth === month && t.cardId === card.id)
        .reduce((sum, t) => sum + t.amount, 0)
    }
    return entry
  })

  const categoryData = { necessario, superfluo, investimento }

  // Build month comparison chart data
  const comparisonData = [...selectedMonths].sort().map((month) => {
    const monthTxs = filtered.filter((t) => t.referenceMonth === month)
    return {
      month,
      necessario: monthTxs.filter((t) => t.category === "necessario").reduce((s, t) => s + t.amount, 0),
      superfluo: monthTxs.filter((t) => t.category === "superfluo").reduce((s, t) => s + t.amount, 0),
      investimento: monthTxs.filter((t) => t.category === "investimento").reduce((s, t) => s + t.amount, 0),
    }
  })

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Visão geral das suas finanças pessoais.</p>
        </div>
        <div className="flex items-center gap-2">
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gasto total</CardDescription>
            <CardTitle className="text-2xl">{currencyFormatter.format(total)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {filtered.length === 0 ? "Nenhum dado ainda. Faça upload de uma fatura." : `${filtered.length} transações`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Necessário</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">
              {currencyFormatter.format(necessario)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Despesas essenciais</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Supérfluo</CardDescription>
            <CardTitle className="text-2xl text-amber-600">
              {currencyFormatter.format(superfluo)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Gastos não essenciais</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Investimento</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {currencyFormatter.format(investimento)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Aportes do mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução mensal</CardTitle>
            <CardDescription>Gastos totais mês a mês</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyEvolutionChart data={chartData} cards={cards} />
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

      {/* Month comparison chart */}
      <Card>
        <CardHeader>
          <CardTitle>Comparação entre meses</CardTitle>
          <CardDescription>Gastos por categoria em cada mês selecionado</CardDescription>
        </CardHeader>
        <CardContent>
          <MonthComparisonChart data={comparisonData} />
        </CardContent>
      </Card>

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
