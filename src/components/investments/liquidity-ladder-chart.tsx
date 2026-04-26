"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

interface LiquidityLadderChartProps {
  data: Array<{ bucket: string; amount: number; pct: number }>
}

const BUCKET_LABELS: Record<string, string> = {
  "0_1": "D+0–1",
  "2_5": "D+2–5",
  "6_15": "D+6–15",
  "16_30": "D+16–30",
  "31_90": "D+31–90",
  "91_180": "D+91–180",
  "more_180": "D+180+",
}

const COLORS = ["#22c55e", "#84cc16", "#f59e0b", "#f97316", "#ef4444", "#a855f7", "#6366f1"]

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: { bucket: string; amount: number; pct: number } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-md border bg-background p-3 shadow-sm text-sm space-y-1">
      <p className="font-medium">{BUCKET_LABELS[d.bucket] ?? d.bucket}</p>
      <p>{brl.format(d.amount)} · {d.pct.toFixed(1)}%</p>
    </div>
  )
}

export function LiquidityLadderChart({ data }: LiquidityLadderChartProps) {
  if (data.length === 0) {
    return <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">Sem dados para exibir</div>
  }

  const labeled = data.map((d) => ({ ...d, label: BUCKET_LABELS[d.bucket] ?? d.bucket }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={labeled} layout="vertical" margin={{ top: 4, right: 40, left: 4, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={72} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
          {labeled.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
