"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"

interface CategoryDistributionChartProps {
  data: {
    necessario: number
    superfluo: number
    investimento: number
  }
}

const COLORS = {
  necessario: "#10b981",
  superfluo: "#f59e0b",
  investimento: "#3b82f6",
}

const LABELS = {
  necessario: "Necessário",
  superfluo: "Supérfluo",
  investimento: "Investimento",
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export function CategoryDistributionChart({ data }: CategoryDistributionChartProps) {
  const isEmpty = data.necessario === 0 && data.superfluo === 0 && data.investimento === 0

  if (isEmpty) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
        Sem dados para exibir
      </div>
    )
  }

  const chartData = [
    { name: LABELS.necessario, value: data.necessario, key: "necessario" as const },
    { name: LABELS.superfluo, value: data.superfluo, key: "superfluo" as const },
    { name: LABELS.investimento, value: data.investimento, key: "investimento" as const },
  ].filter((d) => d.value > 0)

  return (
    <ResponsiveContainer width="100%" height={256}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
        >
          {chartData.map((entry) => (
            <Cell key={entry.key} fill={COLORS[entry.key]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => typeof value === "number" ? currencyFormatter.format(value) : String(value)}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
