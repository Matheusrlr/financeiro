"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { resolveCardColor } from "@/lib/utils"

interface ChartCard {
  id: string
  name: string
  bankCode: string
  color: string
}

interface MonthlyEvolutionChartProps {
  data: Array<{ month: string; [cardId: string]: number | string }>
  cards: ChartCard[]
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export function MonthlyEvolutionChart({ data, cards }: MonthlyEvolutionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
        Sem dados para exibir
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <LineChart data={data}>
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => currencyFormatter.format(v)} width={80} />
        <Tooltip
          formatter={(value) => typeof value === "number" ? currencyFormatter.format(value) : String(value)}
        />
        <Legend />
        {cards.map((card) => (
          <Line
            key={card.id}
            type="monotone"
            dataKey={card.id}
            name={card.name}
            stroke={resolveCardColor(card)}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
