"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts"

interface AllocationEvolutionChartProps {
  data: Array<{ referenceMonth: string; strategy: string; pct: number }>
}

const COLORS: Record<string, string> = {
  "Liquidez": "#22c55e",
  "Título Público": "#6366f1",
  "Pós-fixado": "#EC811D",
  "Inflação": "#f59e0b",
  "Prefixado": "#06b6d4",
  "Multimercado": "#a855f7",
  "Renda Variável": "#ef4444",
  "Global": "#14b8a6",
  "COE": "#f97316",
  "Outros": "#84cc16",
}

function colorForStrategy(s: string, idx: number): string {
  const fallbacks = ["#6366f1", "#EC811D", "#22c55e", "#f59e0b", "#06b6d4", "#a855f7", "#ef4444"]
  return COLORS[s] ?? fallbacks[idx % fallbacks.length]
}

function fmtMonth(ym: string) {
  const [y, m] = ym.split("-")
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
}

export function AllocationEvolutionChart({ data }: AllocationEvolutionChartProps) {
  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">Sem dados para exibir</div>
  }

  // Build rows: { referenceMonth, [strategy]: pct }
  const months = Array.from(new Set(data.map((d) => d.referenceMonth))).sort()
  const strategies = Array.from(new Set(data.map((d) => d.strategy)))

  const rows = months.map((m) => {
    const row: Record<string, string | number> = { referenceMonth: m }
    for (const s of strategies) {
      const entry = data.find((d) => d.referenceMonth === m && d.strategy === s)
      row[s] = entry?.pct ?? 0
    }
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
        <XAxis dataKey="referenceMonth" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
        <Tooltip formatter={(v) => typeof v === "number" ? `${v.toFixed(1)}%` : v} />
        <Legend iconSize={10} />
        {strategies.map((s, i) => (
          <Bar key={s} dataKey={s} stackId="stack" fill={colorForStrategy(s, i)} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
