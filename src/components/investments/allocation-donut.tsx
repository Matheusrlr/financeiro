"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface AllocationDonutProps {
  data: Array<{ strategy: string; value: number; pct: number }>
}

const COLORS = [
  "#EC811D", "#6366f1", "#22c55e", "#f59e0b", "#06b6d4",
  "#a855f7", "#ef4444", "#14b8a6", "#f97316", "#84cc16",
]

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { pct: number } }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="rounded-md border bg-background p-3 shadow-sm text-sm space-y-1">
      <p className="font-medium">{p.name}</p>
      <p>{brl.format(p.value)} · {p.payload.pct.toFixed(1)}%</p>
    </div>
  )
}

export function AllocationDonut({ data }: AllocationDonutProps) {
  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">Sem dados para exibir</div>
  }
  return (
    <ResponsiveContainer width="100%" height={256}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="strategy"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(v, entry) => {
            // @ts-expect-error recharts payload typing
            const pct = entry.payload?.pct ?? 0
            return `${v} ${pct.toFixed(1)}%`
          }}
          iconSize={10}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
