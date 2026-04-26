"use client"

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts"

interface EventsTimelineChartProps {
  data: Array<{ referenceMonth: string; value: number; cumulative: number }>
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

function fmtMonth(ym: string) {
  const [y, m] = ym.split("-")
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-background p-3 shadow-sm text-sm space-y-1">
      {payload.map((p) => (
        <p key={p.name}>
          {p.name === "value" ? "Eventos no mês" : "Acumulado"}: <span className="font-semibold">{brl.format(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

export function EventsTimelineChart({ data }: EventsTimelineChartProps) {
  if (data.length === 0) {
    return <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">Sem dados para exibir</div>
  }

  const labeled = data.map((d) => ({ ...d, month: fmtMonth(d.referenceMonth) }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={labeled} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => brl.format(v)} width={88} />
        <Tooltip content={<CustomTooltip />} />
        <Legend formatter={(v) => v === "value" ? "Eventos no mês" : "Acumulado"} />
        <Bar dataKey="value" name="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
        <Line type="monotone" dataKey="cumulative" name="cumulative" stroke="#EC811D" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
