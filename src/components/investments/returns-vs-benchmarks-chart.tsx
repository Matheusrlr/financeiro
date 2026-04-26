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

interface ReturnsVsBenchmarksChartProps {
  returnMonthPct: number
  returnYearPct: number
  returnInceptionPct: number
  // CDI totals for each period (passed from server if available, else 0)
  cdiMonthPct?: number
  cdiYearPct?: number
  cdiInceptionPct?: number
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-background p-3 shadow-sm text-sm space-y-1">
      <p className="font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill }}>
          {p.name}: {p.value.toFixed(2)}%
        </p>
      ))}
    </div>
  )
}

export function ReturnsVsBenchmarksChart({
  returnMonthPct,
  returnYearPct,
  returnInceptionPct,
  cdiMonthPct = 0,
  cdiYearPct = 0,
  cdiInceptionPct = 0,
}: ReturnsVsBenchmarksChartProps) {
  const data = [
    { period: "Mês", carteira: returnMonthPct, cdi: cdiMonthPct },
    { period: "Ano", carteira: returnYearPct, cdi: cdiYearPct },
    { period: "Desde início", carteira: returnInceptionPct, cdi: cdiInceptionPct },
  ]

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart data={data} barCategoryGap="30%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
        <XAxis dataKey="period" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(1)}%`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="carteira" name="Carteira" fill="#EC811D" radius={[4, 4, 0, 0]} />
        <Bar dataKey="cdi" name="CDI" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
