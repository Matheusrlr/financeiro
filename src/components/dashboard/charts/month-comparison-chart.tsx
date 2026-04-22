"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

export interface MonthComparisonEntry {
  month: string
  necessario: number
  superfluo: number
  investimento: number
}

interface MonthComparisonChartProps {
  data: MonthComparisonEntry[]
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

function formatMonth(ym: string) {
  const [year, month] = ym.split("-")
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
}

export function MonthComparisonChart({ data }: MonthComparisonChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
        Selecione ao menos um mês para ver a comparação
      </div>
    )
  }

  const formatted = data.map((d) => ({ ...d, month: formatMonth(d.month) }))

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart data={formatted} barCategoryGap="20%">
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => currencyFormatter.format(v)}
          width={80}
        />
        <Tooltip
          formatter={(value) =>
            typeof value === "number" ? currencyFormatter.format(value) : String(value)
          }
        />
        <Legend />
        <Bar dataKey="necessario" name="Necessário" fill="#10b981" radius={[3, 3, 0, 0]} />
        <Bar dataKey="superfluo" name="Supérfluo" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        <Bar dataKey="investimento" name="Investimento" fill="#3b82f6" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
