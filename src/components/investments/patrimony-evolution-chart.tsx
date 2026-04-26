"use client"

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts"

interface PatrimonyEvolutionChartProps {
  data: Array<{ referenceMonth: string; patrimony: number; totalContributed: number }>
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

function fmtMonth(ym: string) {
  const [y, m] = ym.split("-")
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: { referenceMonth: string; patrimony: number; totalContributed: number } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-md border bg-background p-3 shadow-sm text-sm space-y-1">
      <p className="font-medium">{fmtMonth(d.referenceMonth)}</p>
      <p>Patrimônio: <span className="font-semibold">{brl.format(d.patrimony)}</span></p>
      <p className="text-muted-foreground">Aportado: {brl.format(d.totalContributed)}</p>
    </div>
  )
}

export function PatrimonyEvolutionChart({ data }: PatrimonyEvolutionChartProps) {
  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">Sem dados para exibir</div>
  }
  return (
    <ResponsiveContainer width="100%" height={256}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
        <XAxis dataKey="referenceMonth" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => brl.format(v)} width={88} />
        <Tooltip content={<CustomTooltip />} />
        <Legend formatter={(v) => v === "totalContributed" ? "Total aportado" : "Patrimônio"} />
        <Area type="monotone" dataKey="totalContributed" fill="#6366f133" stroke="#6366f1" strokeWidth={0} name="totalContributed" />
        <Line type="monotone" dataKey="patrimony" stroke="#EC811D" strokeWidth={2} dot={false} name="patrimony" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
